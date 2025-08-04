# 🔒 Guardz MCP - TypeScript Type Guard Generator

A web-based interface for the Guardz Generator MCP (Model Context Protocol) server, providing TypeScript type guard generation capabilities through a beautiful, modern web interface.

## 🌟 Features

- **Type Guard Generation**: Generate runtime validation functions from TypeScript types
- **File Discovery**: Automatically discover TypeScript files in your project
- **TypeScript Validation**: Validate TypeScript files before processing
- **Code Formatting**: Format generated code with Prettier
- **Code Linting**: Lint generated code with ESLint
- **Modern UI**: Beautiful, responsive web interface
- **Real-time Processing**: Instant feedback and results
- **File Upload**: Drag and drop or select multiple TypeScript files

## 🚀 Quick Start

### Option 1: Use the Web Interface

1. Visit the live web interface at: [https://thiennp.github.io/guardz-mcp.html](https://thiennp.github.io/guardz-mcp.html)
2. Upload your TypeScript files
3. Configure generation options
4. Generate type guards instantly!

### Option 2: Run Locally

1. Clone this repository:
   ```bash
   git clone https://github.com/thiennp/thiennp.github.io.git
   cd thiennp.github.io
   ```

2. Install dependencies:
   ```bash
   cd server
   npm install
   ```

3. Start the API server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000/guardz-mcp.html
   ```

## 📋 API Endpoints

The backend API provides the following endpoints:

### Generate Type Guards
```
POST /api/guardz/generate-type-guards
```

**Request Body:**
```json
{
  "files": ["// TypeScript file content"],
  "config": "guardz.generator.config.ts",
  "type": "User",
  "guardName": "isUser",
  "includes": ["src/**/*.ts"],
  "excludes": ["node_modules/**"],
  "postProcess": true,
  "verbose": false,
  "debug": false
}
```

### Discover Files
```
POST /api/guardz/discover-files
```

### Validate TypeScript
```
POST /api/guardz/validate-typescript
```

### Format Code
```
POST /api/guardz/format-code
```

### Lint Code
```
POST /api/guardz/lint-code
```

### Get Project Info
```
GET /api/guardz/project-info
```

### Health Check
```
GET /api/health
```

## 🛠️ Usage Examples

### Basic Type Guard Generation

1. Upload your TypeScript files
2. Click "Generate Type Guards"
3. Download the generated type guard files

### Advanced Configuration

- **Config File**: Specify a custom configuration file path
- **Specific Type**: Generate guards for a specific type only
- **Custom Guard Name**: Use a custom name for the generated guard function
- **Include/Exclude Patterns**: Control which files are processed
- **Post-processing**: Enable/disable linting and formatting
- **Verbose/Debug Logging**: Get detailed output for troubleshooting

## 🎨 Web Interface Features

- **Tabbed Interface**: Organized sections for different operations
- **File Upload**: Drag and drop or click to select files
- **Real-time Feedback**: Loading indicators and status messages
- **Error Handling**: Clear error messages and suggestions
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Beautiful gradients and smooth animations

## 🔧 Technical Details

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with gradients and animations
- **JavaScript (ES6+)**: Async/await, fetch API, modern DOM manipulation
- **No Dependencies**: Pure vanilla JavaScript

### Backend
- **Node.js**: Server runtime
- **Express.js**: Web framework
- **Guardz Generator**: Core type guard generation
- **CORS**: Cross-origin resource sharing
- **Multer**: File upload handling

### Dependencies
- `guardz-generator`: ^1.12.3
- `guardz`: ^1.12.1
- `express`: ^4.18.2
- `cors`: ^2.8.5
- `multer`: ^1.4.5-lts.1

## 🌐 Deployment

### GitHub Pages (Static)
The web interface is deployed on GitHub Pages and available at:
https://thiennp.github.io/guardz-mcp.html

### Backend API Deployment
For the backend API, you can deploy to:

1. **Vercel**: Serverless deployment
2. **Railway**: Easy deployment with database
3. **Heroku**: Traditional hosting
4. **DigitalOcean**: VPS hosting
5. **AWS/GCP**: Cloud hosting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Guardz Generator**: The core type guard generation library
- **Model Context Protocol**: The MCP specification
- **Express.js**: Web framework
- **GitHub Pages**: Static hosting

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/thiennp/thiennp.github.io/issues)
- **Discussions**: [GitHub Discussions](https://github.com/thiennp/thiennp.github.io/discussions)
- **Email**: thiennp@example.com

---

**Made with ❤️ by Thien Nguyen**
# Test deployment
# Test deployment 2
# Final test - secrets updated
# Test with verified token
# Final verification - secrets updated
# Test workflow trigger
# Test with clean secrets
