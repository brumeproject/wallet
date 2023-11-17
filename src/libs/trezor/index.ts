import TrezorConnect, { Address, Success } from "@trezor/connect-web";
import { TrezorWallet } from "@/libs/trezor/types";

export class Trezor {
  private static instance: Trezor | null = null

  private constructor() {
    // Private constructor to prevent instantiation
  }

  public static init(): Trezor {
    if (!Trezor.instance) {
      Trezor.instance = new Trezor()

      TrezorConnect.init({
        lazyLoad: true, // this param will prevent iframe injection until TrezorConnect.method will be called
        manifest: {
          email: 'developer@xyz.com',
          appUrl: 'http://your.application.com',
        },
      })
    }

    return Trezor.instance;
  }

  public async getEthereumAddressesToIndex(endIndex: number): Promise<TrezorWallet[]> {
    const result = await TrezorConnect.ethereumGetAddress({
      bundle: Array.from(Array(endIndex).keys()).map(index => ({
        path: `m/44'/60'/${index}'/0/0`,
        showOnTrezor: false,
      })),
    });

    if (result.success) {
      const { payload } = result as Success<Address[]>;
      return payload.map(({ address }, index) => ({
        address,
        path: `m/44'/60'/${index}'/0/0`,
      }));
    }

    throw new Error(result.payload.error);
  }
}