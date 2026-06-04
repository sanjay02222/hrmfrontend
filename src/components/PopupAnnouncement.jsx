import React, { useState, useEffect } from 'react';
import '../styles/PopupAnnouncement.css';

const PopupAnnouncement = ({ popupData, onClose }) => {
  if (!popupData || !popupData.status) return null;

  return (
    <div className="popup-announcement-overlay">
      <div className="popup-announcement">
        <button className="popup-close" onClick={onClose}>&times;</button>
        <h2 className="popup-title">{popupData.title}</h2>
        {popupData.image_url && (
          <img src={popupData.image_url} alt="Announcement" className="popup-image" />
        )}
        {popupData.text_content && (
          <div className="popup-text" dangerouslySetInnerHTML={{ __html: popupData.text_content }} />
        )}
      </div>
    </div>
  );
};

export default PopupAnnouncement;
