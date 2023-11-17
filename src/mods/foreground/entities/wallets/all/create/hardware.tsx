import { Button } from "@/libs/ui/button";
import { Outline } from "@/libs/icons/icons";
import { Dialog, useDialogContext } from "@/libs/ui/dialog/dialog";
import TrezorLogo from "@/libs/ui/logo/trezor";
import LedgerLogo from "@/libs/ui/logo/ledger";
import { useCallback, useState } from "react";
import { Trezor } from "@/libs/trezor";
import { TrezorWallet } from "@/libs/trezor/types";
import { Wallet, WalletData } from "@/mods/background/service_worker/entities/wallets/data";
import { useBackgroundContext } from "@/mods/foreground/background/context";
import { Colors } from "@/libs/colors/colors";
import { Emojis } from "@/libs/emojis/emojis";
import { Modhash } from "@/libs/modhash/modhash";
import { useWallets } from "@/mods/foreground/entities/wallets/all/data";

interface SelectableTrezorWallet extends TrezorWallet {
  selected: boolean;
}

export function HardwareWalletCreatorDialog({}) {
  const { close } = useDialogContext().unwrap()
  const walletsQuery = useWallets()
  const maybeWallets = walletsQuery.data?.inner
  const background = useBackgroundContext().unwrap()
  const [error, setError] = useState<string | undefined>()
  const [trezorWallets, setTrezorWallets] = useState<SelectableTrezorWallet[]>([
    // { path: "m/44'/60'/0'/0/0", address: "0x6f2a88EeA710c58bbB8F2681Bf8732Bfb4350062", selected: false },
    // { path: "m/44'/60'/1'/0/0", address: "0xc9babCee61024AA21152858f5e592C0091949f49", selected: false },
    // { path: "m/44'/60'/2'/0/0", address: "0xaA96a50A2f67111262Fe24576bd85Bb56eC65016", selected: false },
    // { path: "m/44'/60'/3'/0/0", address: "0x22a71133E0a9514145B5eA4Ce0B874A9aFD596FB", selected: false },
    // { path: "m/44'/60'/4'/0/0", address: "0xD2AC479d7F5F792f40129B47441Ab56e47de86cF", selected: false },
    // { path: "m/44'/60'/5'/0/0", address: "0xD2AC479d7F5F792f40129B47441Ab56e47de86cF", selected: false },
    // { path: "m/44'/60'/6'/0/0", address: "0xD2AC479d7F5F792f40129B47441Ab56e47de86cF", selected: false },
    // { path: "m/44'/60'/7'/0/0", address: "0xD2AC479d7F5F792f40129B47441Ab56e47de86cF", selected: false },
    // { path: "m/44'/60'/8'/0/0", address: "0xD2AC479d7F5F792f40129B47441Ab56e47de86cF", selected: false },
    // { path: "m/44'/60'/9'/0/0", address: "0xD2AC479d7F5F792f40129B47441Ab56e47de86cF", selected: false },
  ])

  const isTrezorWalletSelected = useCallback(() =>
    trezorWallets.some(wallet => wallet.selected),
    [trezorWallets]
  )

  const connectTrezor = async () => {
    const trezor = Trezor.init()

    trezor.getEthereumAddressesToIndex(10)
      .then(wallets => {
        setError(undefined)

        const importableWallets = wallets.map(wallet => {
          // TODO: check if wallet is already imported and if so, mark it as selected
          // const isAlreadyImported = maybeWallets?.some(w => w.uuid === wallet.address)

          return { ...wallet, selected: false };
        })

        setTrezorWallets(importableWallets as SelectableTrezorWallet[])
      })
      .catch((err: Error) => setError(err.message))
  }

  const updateSelectedWallet = (wallet: SelectableTrezorWallet) => {
    setTrezorWallets(trezorWallets.map(w => w.path === wallet.path ? { ...w, selected: !w.selected } : w))
  }

  const importWallets = async () => {
    const selectedWallets = trezorWallets.filter(wallet => wallet.selected)

    const walletsImport = selectedWallets.map(async ({ path, address }) => {
      const uuid = crypto.randomUUID()
      const modhash = Modhash.from(uuid)
      const color = Colors.mod(modhash)
      const emoji = Emojis.get(modhash)

      const wallet: WalletData = { coin: "ethereum", type: "trezor", uuid, name: address, path, address: address as `0x${string}`, color, emoji }

      await background.tryRequest<Wallet[]>({
        method: "brume_createWallet",
        params: [wallet]
      })
    })

    Promise.all(walletsImport)
      .then(() => close())
  }

  return (
    <>
      <Dialog.Title close={close}>
        Connect a hardware wallet
      </Dialog.Title>
      <div className="h-2" />
      {trezorWallets.length > 0
        ? (
          <div className="flex flex-col justify-between">
            <div className="h-64 overflow-scroll">
              {trezorWallets.map(wallet => {
                return (
                  <div
                    key={wallet.path}
                    onClick={() => updateSelectedWallet(wallet)}
                    className="w-full flex items-center justify-between cursor-pointer px-2 py-2"
                  >
                    <div className="w-full flex items-center justify-start gap-2">
                      <input
                        type="checkbox"
                        checked={wallet.selected}
                        onChange={() => updateSelectedWallet(wallet)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span>{wallet.address}</span>
                    </div>
                    <span className="whitespace-nowrap">0 ETH</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-auto flex items-center flex-wrap-reverse gap-2 pt-4">
              <Button.Gradient className="grow po-md"
                               colorIndex={0}
                               disabled={!isTrezorWalletSelected()}
                               onClick={importWallets}>
                <div className={`${Button.Shrinker.className}`}>
                  <Outline.PlusIcon className="s-sm" />
                  {isTrezorWalletSelected()
                    ? "Import selected wallets"
                    : "Select wallets to import"
                  }
                </div>
              </Button.Gradient>
            </div>
          </div>
        )
        : (
          <div className="w-full flex items-center gap-2">
            <Button.Contrast className="flex-1 whitespace-nowrap p-4 rounded-xl" onClick={connectTrezor}>
              <div className={`${Button.Shrinker.className} flex-col`}>
                <TrezorLogo className="w-24 h-24" />
              </div>
            </Button.Contrast>
            <Button.Contrast className="flex-1 whitespace-nowrap p-4 rounded-xl" disabled>
              <div className={`${Button.Shrinker.className} flex-col`}>
                <LedgerLogo className="w-24 h-24" />
              </div>
            </Button.Contrast>
          </div>
        )
      }
      {error && <div className="text-red-500 text-sm text-center mt-4">{error}</div>}
    </>
  )
}