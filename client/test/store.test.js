import assert from 'node:assert/strict';
import test from 'node:test';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { setUser, setIsAdmin, clearAuth } from '../src/store/slices/authSlice.js';
import showsReducer, { setShows } from '../src/store/slices/showsSlice.js';
import favoritesReducer, { setFavoriteMovies, clearFavorites } from '../src/store/slices/favoritesSlice.js';

test('Redux Toolkit: authSlice handles synchronous actions', () => {
  const store = configureStore({
    reducer: { auth: authReducer },
  });

  assert.equal(store.getState().auth.user, null);
  assert.equal(store.getState().auth.isAdmin, false);

  // Set User
  store.dispatch(setUser({ _id: 'u1', name: 'John Doe', role: 'admin' }));
  assert.equal(store.getState().auth.user.name, 'John Doe');
  assert.equal(store.getState().auth.isAdmin, true);

  // Clear Auth
  store.dispatch(clearAuth());
  assert.equal(store.getState().auth.user, null);
  assert.equal(store.getState().auth.isAdmin, false);
});

test('Redux Toolkit: showsSlice handles setting shows', () => {
  const store = configureStore({
    reducer: { shows: showsReducer },
  });

  assert.deepEqual(store.getState().shows.shows, []);
  store.dispatch(setShows([{ _id: 's1', movie: { title: 'Inception' } }]));
  assert.equal(store.getState().shows.shows.length, 1);
  assert.equal(store.getState().shows.shows[0].movie.title, 'Inception');
});

test('Redux Toolkit: favoritesSlice handles favorites', () => {
  const store = configureStore({
    reducer: { favorites: favoritesReducer },
  });

  assert.deepEqual(store.getState().favorites.favoriteMovies, []);
  store.dispatch(setFavoriteMovies([{ _id: 'm1', title: 'Interstellar' }]));
  assert.equal(store.getState().favorites.favoriteMovies.length, 1);

  store.dispatch(clearFavorites());
  assert.deepEqual(store.getState().favorites.favoriteMovies, []);
});

test('Redux Toolkit: chatSlice handles messages, widgets, and conversationId persistence', async () => {
  const { default: chatReducer, setChatMessages, addChatMessage, updateLastChatMessage, setChatConversationId, resetChat } = await import('../src/store/slices/chatSlice.js');
  
  const store = configureStore({
    reducer: { chat: chatReducer },
  });

  assert.deepEqual(store.getState().chat.messages, []);
  assert.equal(store.getState().chat.conversationId, null);

  // Set conversation ID
  store.dispatch(setChatConversationId('conv-123'));
  assert.equal(store.getState().chat.conversationId, 'conv-123');

  // Add user message
  store.dispatch(addChatMessage({ role: 'user', content: 'Show me comedy movies' }));
  assert.equal(store.getState().chat.messages.length, 1);

  // Add assistant placeholder with widgets
  const movieWidget = { type: 'movie_grid', genre: 'comedy', movies: [{ id: 'm1', title: 'The Hangover' }] };
  store.dispatch(addChatMessage({
    role: 'assistant',
    content: '',
    widgets: [movieWidget],
    bookingSummary: null,
  }));
  assert.equal(store.getState().chat.messages.length, 2);
  assert.deepEqual(store.getState().chat.messages[1].widgets, [movieWidget]);

  // Update last message with streamed text and booking summary
  const summary = { show: { id: 's1' }, seats: ['A1', 'A2'] };
  store.dispatch(updateLastChatMessage({
    content: 'Here are comedy movies for you!',
    bookingSummary: summary,
  }));
  assert.equal(store.getState().chat.messages[1].content, 'Here are comedy movies for you!');
  assert.deepEqual(store.getState().chat.messages[1].widgets, [movieWidget]);
  assert.deepEqual(store.getState().chat.messages[1].bookingSummary, summary);

  // Reset chat
  store.dispatch(resetChat());
  assert.deepEqual(store.getState().chat.messages, []);
  assert.equal(store.getState().chat.conversationId, null);
});

