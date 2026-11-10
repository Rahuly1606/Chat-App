import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { FileText, Image, PaperclipIcon, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [fileAttachment, setFileAttachment] = useState(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const { sendMessage, isSending } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!acceptedTypes.includes(file.type)) {
      toast.error("Please select a JPEG, PNG, WebP, or GIF image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size cannot exceed 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.onerror = () => toast.error("Error processing image");
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size - reduce to 5MB to avoid upload issues
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File size cannot exceed 5MB");
      return;
    }

    // Accept PDF and common document formats
    const acceptedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    
    if (!acceptedTypes.includes(file.type)) {
      toast.error("Please select a PDF, DOC, DOCX, or TXT file");
      return;
    }

    const loadingToast = toast.loading("Processing file...");
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setFileAttachment({
        data: reader.result,
        name: file.name,
        type: file.type
      });
      toast.dismiss(loadingToast);
      toast.success("File ready to send");
    };
    
    reader.onerror = () => {
      toast.dismiss(loadingToast);
      toast.error("Error processing file");
    };
    
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeFile = () => {
    setFileAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !fileAttachment) return;

    try {
      const sent = await sendMessage({
        text: text.trim(),
        image: imagePreview,
        file: fileAttachment
      });

      if (!sent) return;
      setText("");
      setImagePreview(null);
      setFileAttachment(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      toast.error("Failed to send message");
    }
  };

  return (
    <div className="px-1 py-2 sm:px-2 sm:py-3 md:p-4 w-full border-t border-base-300">
      {/* Attachments section - horizontal scroll on mobile */}
      {(imagePreview || fileAttachment) && (
        <div className="mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 sm:pb-2 scrollbar-none">
          {/* Image Preview */}
          {imagePreview && (
            <div className="relative flex-shrink-0">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 object-cover rounded-lg border border-base-300"
              />
              <button
                onClick={removeImage}
                className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-base-300
                flex items-center justify-center shadow-md"
                type="button"
                aria-label="Remove image"
              >
                <X className="size-3 sm:size-3.5" />
              </button>
            </div>
          )}

          {/* File Attachment Preview */}
          {fileAttachment && (
            <div className="relative flex-shrink-0">
              <div className="flex items-center gap-1 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-3 border border-base-300 rounded-lg bg-base-200 h-14 sm:h-16">
                <FileText className="text-primary" size={16} />
                <span className="text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-[120px] md:max-w-[180px]">{fileAttachment.name}</span>
              </div>
              <button
                onClick={removeFile}
                className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-base-300
                flex items-center justify-center shadow-md"
                type="button"
                aria-label="Remove file"
              >
                <X className="size-3 sm:size-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-1 sm:gap-2">
        <div className="flex-1 flex gap-0.5 sm:gap-1 md:gap-2 items-center bg-base-200 rounded-full pl-2.5 sm:pl-3 md:pl-4 pr-0.5 sm:pr-1 py-0.5 sm:py-1">
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-sm sm:text-base text-base-content placeholder:text-base-content/50 min-w-0"
            placeholder="Type a message..."
            value={text}
            aria-label="Message"
            disabled={isSending}
            maxLength={4000}
            onChange={(e) => setText(e.target.value)}
          />
          
          {/* Hidden inputs */}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={imageInputRef}
              onChange={handleImageChange}
              disabled={isSending}
          />
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isSending}
          />

          {/* Attachment buttons */}
          <div className="flex items-center">
            {/* Image upload button */}
            <button
              type="button"
              className={`flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 flex items-center justify-center rounded-full ${imagePreview ? "text-primary" : "text-base-content/70 hover:bg-base-300"}`}
              onClick={() => imageInputRef.current?.click()}
              aria-label="Attach image"
              disabled={isSending}
            >
              <Image size={16} className="sm:size-18" />
            </button>

            {/* File upload button */}
            <button
              type="button"
              className={`flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 flex items-center justify-center rounded-full ${fileAttachment ? "text-primary" : "text-base-content/70 hover:bg-base-300"}`}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach document"
              disabled={isSending}
            >
              <PaperclipIcon size={16} className="sm:size-18" />
            </button>
          </div>
        </div>
        
        {/* Send button */}
        <button
          type="submit"
          className={`btn btn-circle btn-sm sm:btn-md btn-primary ${!text.trim() && !imagePreview && !fileAttachment ? 'opacity-70' : ''}`}
          disabled={isSending || (!text.trim() && !imagePreview && !fileAttachment)}
          aria-label="Send message"
        >
          <Send size={16} className="sm:size-18" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
