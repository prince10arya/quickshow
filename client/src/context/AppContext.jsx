import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [shows, setShows] = useState([]);
  const [favoriteMovies, setFavoriteMovies] = useState([]);
  const { user } = useUser();
  const { getToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const fetchIsAdmin = async () => {
    try {

      const { data } = await axios.get("/api/admin/is-admin", {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      setIsAdmin(data.isAdmin);
    } catch (error) {
      //console.log("error", error);
      setIsAdmin(false); // Set isAdmin to false on error

      // Check if the error is due to a 403 (Forbidden) or 401 (Unauthorized)
      if (
        error.response &&
        (error.response.status === 403 || error.response.status === 401)
      ) {
        if (location.pathname.startsWith("/admin")) {
          navigate("/"); // Redirect if they tried to access an admin path
          toast.error("You are not authorized to view this page."); // More specific message
        }
      } else {
        // Handle other types of errors (e.g., network issues)
        toast.error("An error occurred. Please try again.");
      }
    }
  };
  const fetchShows = async () => {
    try {
      const { data } = await axios.get("/api/shows/all");
      data.success ? setShows(data.show) : toast.error(data.message);
      console.log('data.shows', data.show)
    } catch (error) {
      console.log("error", error);
    }
  };
  const fetchFavouriteMovie = async () => {
    try {
      const { data } = await axios.get("/api/user/favourites", {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      data.success ? setFavoriteMovies(data.movies) : toast.error(data.message);
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {
    fetchShows();
  }, []);

  useEffect(() => {
    if (user) {
      fetchIsAdmin();
      fetchFavouriteMovie();
    }
  }, [user]);

  const value = {
    axios,
    fetchIsAdmin,
    user,
    getToken,
    navigate,
    isAdmin,
    shows,
    favoriteMovies,
    fetchFavouriteMovie,
  };
  return <AppContext.Provider value={value}> {children} </AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
