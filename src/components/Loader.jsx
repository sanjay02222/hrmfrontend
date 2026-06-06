import React from 'react';
import './Loader.css';

const Loader = ({ size = "medium", message = "Processing..." }) => {
  return (
    <div className="custom-loader-container">
      <div className={`custom-loader ${size}`}>
        <div className="loader-ring"></div>
        <img src="/logo.jpeg" alt="Grace International" className="loader-logo" />
      </div>
      {message && <p className="loader-text">{message}</p>}
    </div>
  );
};

export default Loader;
