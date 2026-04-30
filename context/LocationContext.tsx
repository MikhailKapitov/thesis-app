import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
} from "react";
import * as Location from "expo-location";

interface LocationContextType {
  lastLocation: Location.LocationObject | null;
  isAcquiring: boolean; // Useful to show a "waiting for GPS" indicator.
}

const LocationContext = createContext<LocationContextType>({
  lastLocation: null,
  isAcquiring: false,
});

export const useLocation = () => useContext(LocationContext);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lastLocation, setLastLocation] =
    useState<Location.LocationObject | null>(null);
  const [isAcquiring, setIsAcquiring] = useState(false);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let isMounted = true;

    const startLocationServices = async () => {
      try {
        // 1. Request permission.
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("Location permission not granted");
          return;
        }

        // 2. Force a fresh, high‑accuracy fix to wake up the GPS.
        setIsAcquiring(true);
        try {
          const freshLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
            // Give it up to 15 seconds to obtain a fix.
            timeInterval: 15000,
          });
          if (isMounted && freshLocation) {
            setLastLocation(freshLocation);
          }
        } catch (error) {
          console.warn("Initial location fix failed:", error);
        } finally {
          if (isMounted) setIsAcquiring(false);
        }

        // 3. Start watching for ongoing updates (keeps GPS warm).
        subscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High, // Keep GPS active.
            timeInterval: 5000, // Update every 5 seconds.
            distanceInterval: 10, // Or whenever the device moves 10 meters.
          },
          (newLocation) => {
            if (isMounted) {
              setLastLocation(newLocation);
            }
          },
        );
      } catch (error) {
        console.error("Failed to start location services:", error);
        if (isMounted) setIsAcquiring(false);
      }
    };

    startLocationServices();

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, []);

  return (
    <LocationContext.Provider value={{ lastLocation, isAcquiring }}>
      {children}
    </LocationContext.Provider>
  );
};
