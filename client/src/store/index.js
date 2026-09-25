import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import showsReducer from './slices/showsSlice.js';
import favoritesReducer from './slices/favoritesSlice.js';
import chatReducer, { selectChatMessages, selectChatConversationId } from './slices/chatSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    shows: showsReducer,
    favorites: favoritesReducer,
    chat: chatReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

// Root Selectors
export const selectUser = (state) => state.auth.user;
export const selectIsAdmin = (state) => state.auth.isAdmin;
export const selectAuthStatus = (state) => state.auth.status;
export const selectShows = (state) => state.shows.shows;
export const selectShowsStatus = (state) => state.shows.status;
export const selectFavorites = (state) => state.favorites.favoriteMovies;
export const selectFavoritesStatus = (state) => state.favorites.status;
export { selectChatMessages, selectChatConversationId };

export default store;
