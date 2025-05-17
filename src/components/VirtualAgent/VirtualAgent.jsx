import React from 'react';
import './VirtualAgent.css';

const VirtualAgent = () => {
  return (
    <div className="virtual-agent-container">
      <div className="agent-placeholder">
        <div className="placeholder-icon">👤</div>
        <p className="placeholder-text">虚拟形象区域</p>
        <p className="placeholder-description">
          此处将集成Three.js虚拟形象
        </p>
      </div>
    </div>
  );
};

export default VirtualAgent; 