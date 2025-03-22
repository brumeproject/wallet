/* eslint-disable @next/next/no-img-element */
import { Color } from "@/libs/colors/colors";
import { Errors } from "@/libs/errors/errors";
import { Outline } from "@/libs/icons";
import { useModhash } from "@/libs/modhash/modhash";
import { useAsyncUniqueCallback } from "@/libs/react/callback";
import { useInputChange } from "@/libs/react/events";
import { useConstant } from "@/libs/react/ref";
import { WideClickableGradientButton } from "@/libs/ui/button";
import { Dialog } from "@/libs/ui/dialog";
import { ContrastLabel } from "@/libs/ui/label";
import { randomUUID } from "@/libs/uuid/uuid";
import { useBackgroundContext } from "@/mods/foreground/background/context";
import { useLocaleContext } from "@/mods/foreground/global/mods/locale";
import { Locale } from "@/mods/foreground/locale";
import { SeedData } from "@/mods/universal/entities/seeds";
import { HashSubpathProvider, useHashSubpath, usePathContext } from "@hazae41/chemin";
import { Ledger } from "@hazae41/ledger";
import { useCloseContext } from "@hazae41/react-close-context";
import { Panic } from "@hazae41/result";
import { Fragment, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { SimpleInput } from "../../../wallets/actions/send";
import { RawSeedCard } from "../../card";

export function LedgerSeedCreatorDialog(props: {}) {
  const path = usePathContext().getOrThrow()
  const close = useCloseContext().getOrThrow()
  const locale = useLocaleContext().getOrThrow()
  const background = useBackgroundContext().getOrThrow()

  const hash = useHashSubpath(path)

  const uuid = useConstant(() => randomUUID())

  const modhash = useModhash(uuid)
  const color = Color.get(modhash)

  const [rawNameInput = "", setRawNameInput] = useState<string>()

  const defNameInput = useDeferredValue(rawNameInput)

  const onNameInputChange = useInputChange(e => {
    setRawNameInput(e.currentTarget.value)
  }, [])

  const addOrAlert = useAsyncUniqueCallback(() => Errors.runOrLogAndAlert(async () => {
    if (!defNameInput)
      throw new Panic()

    const device = await Ledger.USB.getOrRequestDeviceOrThrow()
    const connector = await Ledger.USB.connectOrThrow(device)

    const { address } = await Ledger.Ethereum.getAddressOrThrow(connector, "44'/60'/0'/0/0")

    const seed: SeedData = { type: "ledger", uuid, name: defNameInput, color: Color.all.indexOf(color), address }

    await background.requestOrThrow<void>({
      method: "brume_createSeed",
      params: [seed]
    }).then(r => r.getOrThrow())

    close()
  }), [defNameInput, uuid, color, background, close])

  const NameInput =
    <ContrastLabel>
      <div className="flex-none">
        {Locale.get(Locale.Name, locale)}
      </div>
      <div className="w-4" />
      <SimpleInput
        placeholder="My seed"
        value={rawNameInput}
        onChange={onNameInputChange} />
    </ContrastLabel>

  const error = useMemo(() => {
    if (!defNameInput)
      return Locale.get(Locale.NameRequired, locale)
    return
  }, [locale, defNameInput])

  const AddButton =
    <WideClickableGradientButton
      color={color}
      disabled={error != null || addOrAlert.loading}
      onClick={addOrAlert.run}>
      <Outline.PlusIcon className="size-5" />
      {error || Locale.get(Locale.Add, locale)}
    </WideClickableGradientButton>

  return <>
    <HashSubpathProvider>
      {hash.url.pathname === "/connect" &&
        <Dialog>
          <HardwareSelectDialog />
        </Dialog>}
    </HashSubpathProvider>
    <Dialog.Title>
      {Locale.get(Locale.NewSeed, locale)}
    </Dialog.Title>
    <div className="h-4" />
    <div className="grow flex flex-col items-center justify-center h-[200px]">
      <div className="w-full max-w-sm">
        <div className="w-full aspect-video rounded-xl">
          <RawSeedCard
            name={defNameInput}
            color={color} />
        </div>
      </div>
    </div>
    <div className="h-2" />
    <div className="flex-1 flex flex-col">
      <div className="grow" />
      {NameInput}
      {/* <div className="h-2" />
      <div className="flex items-center flex-wrap-reverse gap-2">
        <WideShrinkableContrastAnchor
          onKeyDown={connect.onKeyDown}
          onClick={connect.onClick}
          href={connect.href}>
          <Outline.SwatchIcon className="size-5" />
          Choose a device
        </WideShrinkableContrastAnchor>
      </div> */}
      <div className="h-4" />
      <div className="flex items-center flex-wrap-reverse gap-2">
        {AddButton}
      </div>
    </div>
  </>
}

export function HardwareSelectDialog() {
  const [devices, setDevices] = useState<USBDevice[]>([])

  const getDevices = useCallback(() => {
    navigator.usb.getDevices().then(setDevices)
  }, [])

  useEffect(() => {
    const i = setInterval(getDevices, 1000)

    getDevices()

    return () => clearInterval(i)
  }, [getDevices])

  return <>
    <Dialog.Title>
      Connect a hardware wallet
    </Dialog.Title>
    <div className="h-4" />
    <div className="flex flex-col gap-2">
      {devices.map(device =>
        <Fragment key={device.serialNumber}>
          <div className="po-2 bg-default-contrast rounded-xl flex items-center">
            <img className="h-16 w-auto"
              src="/assets/devices/ledger_nano_s.png"
              alt="Ledger Nano S" />
            <div className="w-4" />
            <div className="">
              <div className="">
                {device.productName}
              </div>
              <div className="text-default-contrast">
                {device.manufacturerName}, {device.deviceVersionMajor}.{device.deviceVersionMinor}.{device.deviceVersionSubminor}
              </div>
            </div>
          </div>
        </Fragment>)}
      <div className="po-2 rounded-xl border border-default-contrast border-dashed flex items-center justify-center gap-2 h-[80px]">
        <Outline.PlusIcon className="size-5" />
        New device
      </div>
    </div>
  </>
}