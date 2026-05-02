# ShopHub - Modern E-Commerce Platform

A full-featured MERN stack e-commerce application with modern UI, smooth animations, and comprehensive shopping features.

## 🚀 Features

### Frontend (React + TypeScript)
- **Modern UI/UX** with Material-UI components
- **Smooth Animations** using Framer Motion
- **Responsive Design** for all devices
- **Product Catalog** with advanced filtering and search
- **Shopping Cart** with real-time updates
- **User Authentication** with JWT tokens
- **Order Management** with tracking
- **Wishlist** functionality
- **Product Reviews** and ratings
- **Image Gallery** with zoom functionality
- **Checkout Process** with multiple payment options

### Backend (Node.js + Express)
- **RESTful API** with comprehensive endpoints
- **MongoDB** database with optimized schemas
- **JWT Authentication** with secure token handling
- **File Upload** support for product images
- **Order Processing** with status tracking
- **Cart Management** with session persistence
- **User Profile** management
- **Review System** for products
- **Search Functionality** with indexing
- **Error Handling** and validation

## 🛠 Technology Stack

### Frontend
- React 19 with TypeScript
- Material-UI (MUI) for UI components
- Framer Motion for animations
- React Query for data fetching
- React Router for navigation
- Zustand for state management
- Axios for API calls
- React Hot Toast for notifications

### Backend
- Node.js with Express.js
- MongoDB with Mongoose
- JWT for authentication
- Multer for file uploads
- Express Validator for input validation
- Helmet for security
- Morgan for logging
- CORS for cross-origin requests

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Backend Setup
1. Navigate to the project root
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ecommerce
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=30d
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
   STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
   FRONTEND_URL=http://localhost:3000
   ```
4. Start the backend server:
   ```bash
   npm run server
   ```

### Frontend Setup
1. Navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the client directory:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```
4. Start the frontend development server:
   ```bash
   npm start
   ```

### Running Both Servers
From the project root, run:
```bash
npm run dev
```

## 📁 Project Structure

```
E-commerse - project/
├── server/
│   ├── models/          # Database models
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Category.js
│   │   ├── Order.js
│   │   └── Cart.js
│   ├── routes/          # API routes
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── cart.js
│   │   ├── orders.js
│   │   └── users.js
│   ├── middleware/      # Custom middleware
│   │   └── auth.js
│   └── index.js         # Server entry point
├── client/
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   │   └── Layout/
│   │   ├── pages/        # Page components
│   │   │   ├── Auth/
│   │   │   ├── Home.tsx
│   │   │   ├── Products.tsx
│   │   │   ├── ProductDetail.tsx
│   │   │   ├── Cart.tsx
│   │   │   ├── Checkout.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── Orders.tsx
│   │   │   └── Wishlist.tsx
│   │   ├── services/     # API service functions
│   │   ├── store/        # State management
│   │   └── App.tsx       # Main app component
│   └── package.json
├── package.json
├── .env
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password

### Products
- `GET /api/products` - Get all products with filtering
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)
- `GET /api/products/featured/list` - Get featured products
- `POST /api/products/:id/reviews` - Add product review

### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update` - Update cart item
- `DELETE /api/cart/remove` - Remove item from cart
- `DELETE /api/cart/clear` - Clear cart
- `POST /api/cart/apply-coupon` - Apply coupon
- `DELETE /api/cart/remove-coupon` - Remove coupon

### Orders
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status (Admin only)
- `POST /api/orders/:id/cancel` - Cancel order
- `POST /api/orders/:id/refund-request` - Request refund

### Users
- `GET /api/users/wishlist` - Get user wishlist
- `POST /api/users/wishlist` - Add to wishlist
- `DELETE /api/users/wishlist/:productId` - Remove from wishlist
- `GET /api/users/stats` - Get user statistics
- `POST /api/users/addresses` - Add address
- `PUT /api/users/addresses/:addressId` - Update address
- `DELETE /api/users/addresses/:addressId` - Delete address

## 🎨 UI Features

### Animations
- Page transitions with Framer Motion
- Hover effects on cards and buttons
- Smooth cart add/remove animations
- Loading skeletons for better UX
- Toast notifications for user feedback

### Responsive Design
- Mobile-first approach
- Adaptive layouts for all screen sizes
- Touch-friendly interface
- Optimized images and performance

### User Experience
- Intuitive navigation
- Advanced search and filtering
- Real-time cart updates
- Order tracking
- Wishlist management
- User profile customization

## 🔐 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Helmet security headers
- Rate limiting (can be added)
- SQL injection prevention (with Mongoose)

## 🚀 Deployment

### Frontend (Vercel/Netlify)
1. Build the frontend:
   ```bash
   cd client && npm run build
   ```
2. Deploy the `build` folder to your preferred platform

### Backend (Heroku/Railway/DigitalOcean)
1. Set environment variables
2. Deploy the Node.js application
3. Configure MongoDB connection

### Environment Variables
Make sure to set these in production:
- `NODE_ENV=production`
- `MONGODB_URI` (your MongoDB connection string)
- `JWT_SECRET` (strong random string)
- `STRIPE_SECRET_KEY` (for payments)
- `FRONTEND_URL` (your frontend URL)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Material-UI for the amazing component library
- Framer Motion for smooth animations
- React Query for efficient data fetching
- MongoDB for the flexible database
- Express.js for the robust backend framework

## 📞 Support

If you have any questions or need support, feel free to:
- Open an issue on GitHub
- Contact the development team
- Check the documentation

---

**Happy Shopping! 🛍️**
