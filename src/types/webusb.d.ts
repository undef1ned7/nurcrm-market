// Minimal ambient WebUSB typings.
// The app talks to Chromium's WebUSB API (ESC/POS receipt printers) but
// `@types/w3c-web-usb` is not a dependency and `lib.dom` does not ship these
// names. Only what the print service (`src/pages/sell/ui/services/print/*`)
// annotates is declared here; member access stays permissive on purpose so
// this does not surface new errors in code that already treats devices loosely.

interface USBDevice {
  readonly vendorId: number;
  readonly productId: number;
  readonly opened: boolean;
  readonly manufacturerName?: string;
  readonly productName?: string;
  readonly serialNumber?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly configuration: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly configurations: any[];
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  selectAlternateInterface(
    interfaceNumber: number,
    alternateSetting: number,
  ): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transferOut(endpointNumber: number, data: BufferSource): Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transferIn(endpointNumber: number, length: number): Promise<any>;
}
