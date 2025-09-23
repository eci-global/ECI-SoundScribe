import React from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';

interface UploadFABProps {
  onUpload: () => void;
  isCollapsed: boolean;
}

export default function UploadFAB({ onUpload, isCollapsed }: UploadFABProps) {
  return (
    <div className="p-6">
      <motion.button
        onClick={onUpload}
        className="w-full bg-gradient-to-r from-[#62E7D3] to-[#CE8CFF] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2"
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        animate={{
          borderRadius: isCollapsed ? '50%' : '9999px',
          padding: isCollapsed ? '12px' : '12px 24px'
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <div className="flex items-center justify-center gap-2">
          <Upload className="w-5 h-5" strokeWidth={1.5} />
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="font-medium whitespace-nowrap"
            >
              Upload
            </motion.span>
          )}
        </div>
      </motion.button>
    </div>
  );
}