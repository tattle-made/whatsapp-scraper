import React from 'react';

const Checkbox = ({ className, checked, ...props }) => (
  <input type="checkbox" {...props} />
);

export default Checkbox;
