# Package Installation Guide

## Required Packages for PROXI

Before running the app, you need to install the following packages:

### 1. expo-secure-store (for persistent auth)
```bash
npx expo install expo-secure-store
```

OR with npm:
```bash
npm install expo-secure-store
```

### 2. react-native-maps (for map functionality)
```bash
npx expo install react-native-maps
```

OR with npm:
```bash
npm install react-native-maps
```

## Alternative: Install All at Once

If you have npm installed:
```bash
npm install expo-secure-store react-native-maps
```

## Verify Installation

After installation, your `package.json` should include:
```json
{
  "dependencies": {
    "expo-secure-store": "~13.0.x",
    "react-native-maps": "1.x.x"
  }
}
```

## If npx/npm is not available

1. **Install Node.js** from https://nodejs.org/
2. Restart your terminal/VS Code
3. Run the installation commands above

## Running the App

Once packages are installed:
```bash
npx expo start
```

Or if you have the Expo Go app:
```bash
expo start
```

---

**Current Status**: Code is ready, packages need to be installed.
