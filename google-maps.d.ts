declare namespace google.maps {
  class Map {
    constructor(el: HTMLElement, opts: MapOptions)
    panTo(latlng: LatLngLiteral): void
    fitBounds(bounds: LatLngBounds, padding?: number | Padding): void
    setCenter(latlng: LatLngLiteral): void
  }
  class Marker {
    constructor(opts: MarkerOptions)
    setIcon(icon: Icon): void
    setZIndex(z: number): void
    addListener(event: string, handler: () => void): void
  }
  class InfoWindow {
    setContent(content: string): void
    open(map: Map, anchor?: Marker): void
  }
  class LatLngBounds {
    extend(point: LatLngLiteral): void
  }
  class LatLng {
    constructor(lat: number, lng: number)
  }
  class DirectionsService {
    route(request: DirectionsRequest, callback: (result: any, status: any) => void): void
  }
  class DirectionsRenderer {
    constructor(opts: DirectionsRendererOptions)
    setDirections(directions: any): void
  }
  class Polyline {
    constructor(opts: PolylineOptions)
  }
  class Size {
    constructor(width: number, height: number)
  }
  class Point {
    constructor(x: number, y: number)
  }

  enum TravelMode { WALKING = "WALKING", DRIVING = "DRIVING" }

  interface MapOptions {
    center?: LatLngLiteral
    zoom?: number
    disableDefaultUI?: boolean
    zoomControl?: boolean
    fullscreenControl?: boolean
    mapId?: string
  }
  interface MarkerOptions {
    position: LatLngLiteral
    map: Map
    title?: string
    icon?: Icon
    zIndex?: number
  }
  interface Icon {
    url: string
    scaledSize: Size
    anchor: Point
  }
  interface LatLngLiteral { lat: number; lng: number }
  interface Padding { top: number; right: number; bottom: number; left: number }
  interface DirectionsRequest {
    origin: LatLngLiteral
    destination: LatLngLiteral
    waypoints?: DirectionsWaypoint[]
    travelMode: TravelMode
    optimizeWaypoints?: boolean
  }
  interface DirectionsWaypoint { location: LatLng; stopover: boolean }
  interface DirectionsRendererOptions {
    suppressMarkers?: boolean
    polylineOptions?: PolylineOptions
    map?: Map
  }
  interface PolylineOptions {
    path?: LatLngLiteral[]
    strokeColor?: string
    strokeOpacity?: number
    strokeWeight?: number
    geodesic?: boolean
    map?: Map
  }
}
