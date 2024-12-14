import React, { useRef } from 'react';
import { IoImageOutline } from 'react-icons/io5';
import { MdClose } from 'react-icons/md';

const ImageUploader = ({ onImageSelect, children }) => {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = (event) => {
    if (event?.target?.files) {
      onImageSelect(event);
    }
  };

  return (
    <div onClick={handleClick} style={{ cursor: 'pointer' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept="image/*"
        multiple
        style={{ display: 'none' }}
      />
      {children}
    </div>
  );
};

export default ImageUploader;