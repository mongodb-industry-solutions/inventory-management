'use client'
import React from 'react';


function Header() {
  return (
    <div className="layout-header">
      <img src="/images/logo.png" alt="Logo" className="logo" />
      <h1 className="header-title"></h1>
      <div className="user-info">
        <img src="/images/userAvatar.png" alt="User Avatar" className="user-avatar" />
        <div>
            <div className="user-name">Eddie Grant</div>
            <div className="user-job-title">Store Manager</div>
        </div>
      </div>
    </div>
  );
}

export default Header;

