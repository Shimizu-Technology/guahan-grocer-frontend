# Image Components

Simple, reliable image loading for React Native.

## SimpleImage

The only image component you need. Handles all image types reliably without modification.

### Basic Usage

```tsx
import SimpleImage from '../../components/shared/SimpleImage';

// Simple usage
<SimpleImage
  src={product.imageUrl}
  style={styles.productImage}
  accessibilityLabel="Product image"
/>

// With fallback
<SimpleImage
  src={product.imageUrl}
  style={styles.productImage}
  accessibilityLabel="Product image"
  fallbackSrc="https://backup-image-url.com/placeholder.jpg"
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `src` | `string` | ✅ | Source image URL |
| `style` | `ImageStyle` | ✅ | React Native style object |
| `accessibilityLabel` | `string` | ✅ | Accessibility label for screen readers |
| `fallbackSrc` | `string` | ⭕ | Optional fallback image URL |
| `resizeMode` | `'cover' \| 'contain' \| 'stretch' \| 'center'` | ⭕ | Image resize mode (default: 'cover') |

### Features

✅ **Universal**: Works with any image URL (S3, Unsplash, external)  
✅ **Reliable**: No broken images or 404 loops  
✅ **Automatic Fallback**: Gracefully handles failed image loads  
✅ **Clean Loading**: Professional loading states  
✅ **Accessible**: Built-in accessibility support  
✅ **Performance**: Optimized for React Native  

### Error Handling

SimpleImage automatically handles image loading failures:

1. **Try original URL** - Attempts to load the provided `src`
2. **Try fallback URL** - If provided, attempts `fallbackSrc` on error  
3. **Use default fallback** - Falls back to a reliable default image
4. **Prevent retries** - Tracks failed URLs to prevent infinite loops

### Loading States

- **Loading**: Shows a clean gray placeholder
- **Success**: Displays the image seamlessly  
- **Error**: Automatically falls back to working image

### Console Logging

In development mode, SimpleImage only logs essential warnings:

```
SimpleImage: Failed to load https://broken-url.com falling back...
```

This is normal behavior - it shows your fallback system is working correctly.

## Migration Complete

All screens now use SimpleImage for consistent, reliable image loading:

- 📱 **Catalog**: Product grid images  
- 🏠 **Home**: Featured product images  
- ❤️ **Favorites**: Favorite item images  
- 🛒 **Cart**: Cart item images  
- 🚚 **Driver**: Order item images  

## Example Usage Across App

```tsx
// Product catalog
<SimpleImage 
  src={product.imageUrl} 
  style={styles.productImage}
  accessibilityLabel={`${product.name} product image`}
/>

// Cart items  
<SimpleImage 
  src={item.imageUrl} 
  style={styles.cartImage}
  accessibilityLabel={`${item.name} cart item image`}
/>

// With custom fallback
<SimpleImage 
  src={user.avatarUrl} 
  style={styles.avatar}
  accessibilityLabel="User profile picture"
  fallbackSrc="https://example.com/default-avatar.png"
/>
```

The components work reliably without cluttering your development console! 🎉 