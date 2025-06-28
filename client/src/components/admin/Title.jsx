import React from 'react'

const Title = ( { t1, t2 }) => {
  return (
    <h1 className=" font-medium text-2xl">
      {t1} <span className=" underline text-primary">
        {t2}
      </span>
    </h1>
  )
}

export default Title
