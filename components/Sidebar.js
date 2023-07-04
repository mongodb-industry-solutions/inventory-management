'use client'

import React, { useState } from 'react';

function Sidebar() {
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);

  const handleSizeChange = (size) => {
    if (sizes.includes(size)) {
      setSizes(sizes.filter((s) => s !== size));
    } else {
      setSizes([...sizes, size]);
    }
  };

  const handleColorChange = (color) => {
    if (colors.includes(color)) {
      setColors(colors.filter((c) => c !== color));
    } else {
      setColors([...colors, color]);
    }
  };

  return (
    <div className="sidebar">
      <div className="size-filters">
        <h3>Size</h3>
        <label>
          <input
            type="checkbox"
            checked={sizes.includes('XS')}
            onChange={() => handleSizeChange('XS')}
          />
          <span>XS</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={sizes.includes('S')}
            onChange={() => handleSizeChange('S')}
          />
          <span>S</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={sizes.includes('M')}
            onChange={() => handleSizeChange('M')}
          />
          <span>M</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={sizes.includes('L')}
            onChange={() => handleSizeChange('L')}
          />
          <span>L</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={sizes.includes('XL')}
            onChange={() => handleSizeChange('XL')}
          />
          <span>XL</span>
        </label>
      </div>

      <div className="color-filters">
        <h3>Color</h3>
        <label>
          <input
            type="checkbox"
            checked={colors.includes('Red')}
            onChange={() => handleColorChange('Red')}
          />
          <span>Red</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={colors.includes('Blue')}
            onChange={() => handleColorChange('Blue')}
          />
          <span>Blue</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={colors.includes('Green')}
            onChange={() => handleColorChange('Green')}
          />
          <span>Green</span>
        </label>
      </div>
    </div>
  );
}

export default Sidebar;
