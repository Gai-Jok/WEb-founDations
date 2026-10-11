# Library Books REST API

## Overview

This REST API allows users to retrieve, add, update, and delete books in a library system.

**Base URL:** `/api`

Each book has an ID, title, author, and publication year.

## Endpoints

### 1. List All Books

* **Method:** `GET`
* **Path:** `/api/books`
* **Description:** Retrieves a list of all books in the library.
* **Example request body:** None required.
* **Success status code:** `200 OK`

**Example request:**

```http
GET /api/books
```

### 2. Get One Book

* **Method:** `GET`
* **Path:** `/api/books/{id}`
* **Description:** Retrieves a single book using its unique ID.
* **Example request body:** None required.
* **Success status code:** `200 OK`

**Example request:**

```http
GET /api/books/1
```

### 3. Create a Book

* **Method:** `POST`
* **Path:** `/api/books`
* **Description:** Adds a new book to the library.
* **Example request body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "year": 1958
}
```

* **Success status code:** `201 Created`

### 4. Update a Book

* **Method:** `PUT`
* **Path:** `/api/books/{id}`
* **Description:** Replaces the details of an existing book using its ID.
* **Example request body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "year": 1959
}
```

* **Success status code:** `200 OK`

### 5. Delete a Book

* **Method:** `DELETE`
* **Path:** `/api/books/{id}`
* **Description:** Deletes a book from the library using its ID.
* **Example request body:** None required.
* **Success status code:** `204 No Content`

**Example request:**

```http
DELETE /api/books/1
```

A `204 No Content` response means the deletion succeeded and the server returns no response body.

### 6. List Books by Author

* **Method:** `GET`
* **Path:** `/api/books?author={author}`
* **Description:** Retrieves books written by the specified author.
* **Example request body:** None required.
* **Success status code:** `200 OK`

**Example request:**

```http
GET /api/books?author=Chinua%20Achebe
```

The `author` query parameter filters the results. `%20` represents a space in the author's name.

### 7. Search Books by Title

* **Method:** `GET`
* **Path:** `/api/books?title={title}`
* **Description:** Retrieves books whose titles match the specified title.
* **Example request body:** None required.
* **Success status code:** `200 OK`

**Example request:**

```http
GET /api/books?title=Things%20Fall%20Apart
```

## Error Responses

### 400 Bad Request

**Description:** The server cannot process the request because the supplied input is invalid.

**Example:** A client attempts to create a book without providing the required title.

**Example request body:**

```json
{
  "author": "Chinua Achebe",
  "year": 1958
}
```

**Response status code:** `400 Bad Request`

### 404 Not Found

**Description:** The requested resource does not exist.

**Example:** A client requests a book with ID `999`, but no book with that ID exists in the library.

**Example request:**

```http
GET /api/books/999
```

**Response status code:** `404 Not Found`
