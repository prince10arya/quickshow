import React from 'react'

const Loading = ( {className }) => {


  return (
    <div
      className={`loader relative left-1/2 md:top-1/2 top-1/3 ${className}`}
    ></div>
  );
}

export default Loading
