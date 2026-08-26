CREATE UNIQUE INDEX users_handle_casefold_unique_idx ON users (LOWER(handle));
