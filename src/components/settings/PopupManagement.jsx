import React, { useState, useRef } from "react";
import '../../styles/PopupManagement.css';

const PopupManagement = ({ popup, onSave, onPreview }) => {
  const [status, setStatus] = useState(popup?.status || false);
  const [title, setTitle] = useState(popup?.title || '');
  const [textContent, setTextContent] = useState(popup?.text_content || '');
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(popup?.image_url || '');
  const fileInputRef = useRef();
  const handleStatusChange = (e) => setStatus(e.target.checked);
  const handleTitleChange = (e) => setTitle(e.target.value);
  const handleTextChange = (e) => setTextContent(e.target.value);
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) setImageUrl(URL.createObjectURL(file));
  };
  const handleSave = () => {
    onSave({ status, type: 'mixed', title, text_content: textContent, imageFile });
  };
  const handlePreview = () => {
    onPreview({ status, type: 'mixed', title, text_content: textContent, image_url: imageUrl });
  };

  return (
    <div className="popup-management-container">
      <h2>Popup Management</h2>
      <div className="popup-form-group">
        <label>
          <input type="checkbox" checked={status} onChange={handleStatusChange} />
          Popup ON/OFF
        </label>
      </div>
      <div className="popup-form-group">
        <label>Title</label>
        <input type="text" value={title} onChange={handleTitleChange} placeholder="Popup Title" />
      </div>
      <div className="popup-form-group">
        <label>Text Content (Notice)</label>
        <textarea value={textContent} onChange={handleTextChange} rows={4} placeholder="Enter announcement text..." />
      </div>
      <div className="popup-form-group">
        <label>Upload Image</label>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} />
        {imageUrl && <img src={imageUrl} alt="Popup Preview" className="popup-image-preview" />}
      </div>
      <div className="popup-form-actions">
        <button className="popup-btn" onClick={handleSave}>Save / Update</button>
        <button className="popup-btn secondary" onClick={handlePreview}>Preview</button>
      </div>
    </div>
  );
};

export default PopupManagement;
