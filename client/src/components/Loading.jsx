import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const Loading = ( {className }) => {

  const { nextUrl }  = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if(nextUrl){
      setTimeout(() => {
        navigate('/' + nextUrl)
      }, 8000)
    }
  }, [])
  return (
    <div
      className={`loader relative ${className}`}
    ></div>
  );
}

export default Loading
