'use client'

import React, { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';



function Sidebar() {
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [isShrunk, setIsShrunk] = useState(false);

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

  const toggleShrink = () => {
    setIsShrunk(!isShrunk);
  };

  return (
    <div className={`sidebar ${isShrunk ? 'shrunk' : ''}`}>
      <div className={`sidebar-header ${isShrunk ? 'shrunk' : ''}`}>
        {isShrunk && <img src="/images/filters.png" alt="filtersLogo" className="filterslogo" />}
        {!isShrunk && <h3>Filters</h3>}
      </div>

      {!isShrunk && (
        <>
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
            checked={colors.includes('Light Green')}
            onChange={() => handleColorChange('Light Green')}
          />
          <span> Light Green</span>
        </label>
        <label>
              <input
                type="checkbox"
                checked={colors.includes('Dark Green')}
                onChange={() => handleColorChange('Dark Green')}
              />
              <span>Dark Green</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={colors.includes('Black')}
                onChange={() => handleColorChange('Black')}
              />
              <span>Black</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={colors.includes('Yellow')}
                onChange={() => handleColorChange('Yellow')}
              />
              <span>Yellow</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={colors.includes('Orange')}
                onChange={() => handleColorChange('Orange')}
              />
              <span>Orange</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={colors.includes('Purple')}
                onChange={() => handleColorChange('Purple')}
              />
              <span>Purple</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={colors.includes('Light Blue')}
                onChange={() => handleColorChange('Light Blue')}
              />
              <span>Light Blue</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={colors.includes('Pink')}
                onChange={() => handleColorChange('Pink')}
              />
              <span>Pink</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={colors.includes('Grey')}
                onChange={() => handleColorChange('Grey')}
              />
              <span>Grey</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={colors.includes('Light Brown')}
                onChange={() => handleColorChange('Light Brown')}
              />
              <span>Light Brown</span>
            </label>
          </div>
        </>
      )}

      <div className="toggle-button" onClick={toggleShrink}>
      {isShrunk ? (
    <FaChevronRight style={{ color: '2B664C' }} />
  ) : (
    <FaChevronLeft style={{ color: '2B664C' }} />
  )}
      </div>
    </div>
  );
}

export default Sidebar;
