import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    StatusBar,
    BackHandler,
    Platform,
    ActivityIndicator
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const PORTAL_URL = 'https://supervisors-docs.vercel.app';
const PRIMARY_COLOR = '#005952';
const PRIMARY_DARK = '#00433e';

function MainApp() {
    const insets = useSafeAreaInsets();
    const webViewRef = useRef<WebView>(null);
    const [canGoBack, setCanGoBack] = useState(false);
    const [loading, setLoading] = useState(true);

    // Hardware back button support for Android
    useEffect(() => {
        if (Platform.OS !== 'android') return;

        const onBackPress = () => {
            if (canGoBack && webViewRef.current) {
                webViewRef.current.goBack();
                return true;
            }
            return false;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [canGoBack]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar
                barStyle="light-content"
                backgroundColor={PRIMARY_DARK}
                translucent={true}
            />

            <WebView
                ref={webViewRef}
                source={{ uri: PORTAL_URL }}
                applicationNameForUserAgent="InisCareSupervisorsApp/1.2"
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
                allowsInlineMediaPlayback={true}
                allowsBackForwardNavigationGestures={true}
                onNavigationStateChange={(navState) => {
                    setCanGoBack(navState.canGoBack);
                }}
                onLoadEnd={() => setLoading(false)}
                style={styles.webview}
                renderLoading={() => (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                    </View>
                )}
            />
        </View>
    );
}

export default function App(): React.JSX.Element {
    return (
        <SafeAreaProvider>
            <MainApp />
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PRIMARY_DARK
    },
    webview: {
        flex: 1,
        backgroundColor: '#f8fafc'
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center'
    }
});
