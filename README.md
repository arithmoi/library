# Arithmoi Library

Welcome to the Arithmoi Library, an initiative of The Arithmoi Foundation. This digital library is dedicated to providing resources that support the study of mathematics, physics, and metaphysics from an ontological perspective. Our collection aims to help users explore fundamental questions about the nature of reality.

## About The Arithmoi Foundation

The Arithmoi Foundation focuses on advancing research and understanding in foundational mathematics, theoretical physics, and their intersection with metaphysics. This library is a key component of our mission to disseminate knowledge and foster inquiry in these critical areas.

## Project Structure

This website is built using [Astro](https://astro.build/), a modern static site generator. Key directories include:

-   `/public/`: Contains static assets like images (including the site logo `library_logo.png`) and PDF documents.
-   `/src/`: Contains the source code for the website.
    -   `/components/`: Reusable Astro components (e.g., `Navbar.astro`, `Sidebar.astro`, `Footer.astro`).
    -   `/data/`: JSON files that may store structured data for books, articles, etc. (e.g., `books.json`).
    -   `/layouts/`: Base layout components, primarily `Layout.astro`.
    -   `/pages/`: Astro files that define the routes and content for each page of the site.
        -   `/library/`: Contains pages specific to the library section, including dynamic routes for book details.
    -   `/styles/`: Global CSS styles.
-   `LICENSE`: Contains the copyright and licensing information for this project. All rights are reserved by the Arithmoi Foundation.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command           | Action                                         |
| :---------------- | :--------------------------------------------- |
| `npm install`     | Installs dependencies                          |
| `npm run dev`     | Starts local dev server at `localhost:4321`    |
| `npm run build`   | Builds your production site to `./dist/`       |
| `npm run preview` | Previews your build locally, before deploying  |

## ⚖️ License

The content and code of this website are under the copyright of The Arithmoi Foundation. All Rights Reserved. Please see the `LICENSE` file for more details.

## 📞 Contact

For inquiries related to The Arithmoi Foundation or this library, please contact `admin@arithmoi.org`.
