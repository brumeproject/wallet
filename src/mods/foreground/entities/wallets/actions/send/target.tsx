/* eslint-disable @next/next/no-img-element */
import { chainDataByChainId } from "@/libs/ethereum/mods/chain";
import { Outline } from "@/libs/icons";
import { nto } from "@/libs/ntu";
import { useEffectButNotFirstTime } from "@/libs/react/effect";
import { useInputChange, useKeyboardEnter } from "@/libs/react/events";
import { ClickableContrastButtonInInputBox, RoundedClickableNakedButton } from "@/libs/ui/button";
import { Dialog } from "@/libs/ui/dialog";
import { ContrastLabel } from "@/libs/ui/label";
import { useLocaleContext } from "@/mods/foreground/global/mods/locale";
import { Locale } from "@/mods/foreground/locale";
import { useContractToken } from "@/mods/universal/ethereum/mods/tokens/mods/core/hooks";
import { usePathContext, useSearchState } from "@hazae41/chemin";
import { Address } from "@hazae41/cubane";
import { Option } from "@hazae41/option";
import { SyntheticEvent, useCallback, useDeferredValue, useMemo, useState } from "react";
import { SimpleInput } from ".";
import { useEnsLookup } from "../../../names/data";
import { useWalletDataContext } from "../../context";
import { useEthereumContext } from "../../data";

export function WalletSendScreenTarget(props: {}) {
  const path = usePathContext().getOrThrow()
  const locale = useLocaleContext().getOrThrow()
  const wallet = useWalletDataContext().getOrThrow()

  const [maybeStep, setStep] = useSearchState(path, "step")
  const [maybeChain, setChain] = useSearchState(path, "chain")
  const [maybeTarget, setTarget] = useSearchState(path, "target")
  const [maybeType, setType] = useSearchState(path, "type")
  const [maybeToken, setToken] = useSearchState(path, "token")

  const maybeTokenAddress = useMemo(() => {
    if (maybeToken == null)
      return
    return Address.fromOrNull(maybeToken)
  }, [maybeToken])

  const chain = Option.wrap(maybeChain).getOrThrow()
  const chainData = chainDataByChainId[Number(chain)]

  const context = useEthereumContext(wallet.uuid, chainData).getOrThrow()

  const tokenQuery = useContractToken(context, maybeTokenAddress, "latest")
  const maybeTokenData = Option.wrap(tokenQuery.current?.getOrNull())
  const tokenData = maybeTokenData.getOr(chainData.token)

  const [rawTargetInput = "", setRawTargetInput] = useState(nto(maybeTarget))

  const onTargetInputChange = useInputChange(e => {
    setRawTargetInput(e.target.value)
  }, [])

  const targetInput = useDeferredValue(rawTargetInput)

  useEffectButNotFirstTime(() => {
    setType(undefined)
    setTarget(targetInput)
  }, [targetInput])

  const maybeEnsInput = maybeTarget?.endsWith(".eth")
    ? targetInput
    : undefined

  const mainnet = useEthereumContext(wallet.uuid, chainDataByChainId[1]).getOrThrow()

  const ensQuery = useEnsLookup(maybeEnsInput, mainnet)
  const maybeEns = ensQuery.current?.getOrNull()

  const onSubmit = useCallback(async () => {
    if (maybeTarget == null)
      return
    if (Address.fromOrNull(maybeTarget) == null && !maybeTarget.endsWith(".eth"))
      return
    setStep("value")
  }, [maybeTarget, setStep])

  const onEnter = useKeyboardEnter(() => {
    onSubmit()
  }, [onSubmit])

  const onClear = useCallback((e: SyntheticEvent) => {
    setRawTargetInput("")
  }, [])

  const onPaste = useCallback(async () => {
    const input = await navigator.clipboard.readText()

    if (Address.fromOrNull(input) == null && !input.endsWith(".eth"))
      return

    setType(undefined)
    setTarget(input)
    setStep("value")
  }, [setType, setStep, setTarget])

  const [mode, setMode] = useState<"recents" | "contacts">("recents")

  const onRecentsClick = useCallback(() => {
    setMode("recents")
  }, [])

  const onContactsClick = useCallback(() => {
    setMode("contacts")
  }, [])

  const onPeanutClick = useCallback(() => {
    setType("peanut")
    setTarget(undefined)
    setStep("value")
  }, [setType, setStep, setTarget])

  const onBrumeClick = useCallback(() => {
    setType(undefined)
    setTarget("brume.eth")
    setStep("value")
  }, [setType, setStep, setTarget])

  return <>
    <Dialog.Title>
      {Locale.get({
        en: `Send ${tokenData.symbol} on ${chainData.name}`,
        zh: `在 ${chainData.name} 上发送 ${tokenData.symbol}`,
        hi: `${chainData.name} पर ${tokenData.symbol} भेजें`,
        es: `Enviar ${tokenData.symbol} en ${chainData.name}`,
        ar: `إرسال ${tokenData.symbol} على ${chainData.name}`,
        fr: `Envoyer ${tokenData.symbol} sur ${chainData.name}`,
        de: `Senden ${tokenData.symbol} auf ${chainData.name}`,
        ru: `Отправить ${tokenData.symbol} на ${chainData.name}`,
        pt: `Enviar ${tokenData.symbol} em ${chainData.name}`,
        ja: `${chainData.name} で ${tokenData.symbol} を送信する`,
        pa: `${chainData.name} 'ਤੇ ${tokenData.symbol} ਭੇਜੋ`,
        bn: `${chainData.name} তে ${tokenData.symbol} পাঠান`,
        id: `Kirim ${tokenData.symbol} di ${chainData.name}`,
        ur: `${chainData.name} پر ${tokenData.symbol} بھیجیں`,
        ms: `Hantar ${tokenData.symbol} di ${chainData.name}`,
        it: `Invia ${tokenData.symbol} su ${chainData.name}`,
        tr: `${chainData.name} üzerinde ${tokenData.symbol} gönder`,
        ta: `${chainData.name} உள்ளிட்டு ${tokenData.symbol} அனுப்பவும்`,
        te: `${chainData.name} లో ${tokenData.symbol} పంపండి`,
        ko: `${chainData.name} 에서 ${tokenData.symbol} 보내기`,
        vi: `Gửi ${tokenData.symbol} trên ${chainData.name}`,
        pl: `Wyślij ${tokenData.symbol} na ${chainData.name}`,
        ro: `Trimite ${tokenData.symbol} pe ${chainData.name}`,
        nl: `Verzend ${tokenData.symbol} op ${chainData.name}`,
        el: `Στείλτε ${tokenData.symbol} στο ${chainData.name}`,
        th: `ส่ง ${tokenData.symbol} ใน ${chainData.name}`,
        cs: `Poslat ${tokenData.symbol} na ${chainData.name}`,
        hu: `Küldj ${tokenData.symbol} a ${chainData.name} -on`,
        sv: `Skicka ${tokenData.symbol} på ${chainData.name}`,
        da: `Send ${tokenData.symbol} på ${chainData.name}`,
      }, locale)}
    </Dialog.Title>
    <div className="h-4" />
    <ContrastLabel>
      <div className="flex-none">
        {Locale.get(Locale.Recipient, locale)}
      </div>
      <div className="w-4" />
      <SimpleInput
        autoFocus
        value={rawTargetInput}
        onChange={onTargetInputChange}
        onKeyDown={onEnter}
        placeholder="someone.eth" />
      <div className="w-1" />
      <div className="flex items-center">
        {rawTargetInput.length === 0
          ? <RoundedClickableNakedButton
            onClick={onPaste}>
            <Outline.ClipboardIcon className="size-4" />
          </RoundedClickableNakedButton>
          : <RoundedClickableNakedButton
            onClick={onClear}>
            <Outline.XMarkIcon className="size-4" />
          </RoundedClickableNakedButton>}
        <div className="w-1" />
        <ClickableContrastButtonInInputBox
          onClick={onSubmit}>
          OK
        </ClickableContrastButtonInInputBox>
      </div>
    </ContrastLabel>
    {maybeEns != null && <>
      <div className="h-2" />
      <div className="po-2 flex items-center bg-default-contrast rounded-xl cursor-pointer"
        role="button"
        onClick={onSubmit}>
        <div className="size-12 flex-none rounded-full bg-default-contrast" />
        <div className="w-4" />
        <div className="flex flex-col truncate">
          <div className="font-medium">
            {targetInput}
          </div>
          <div className="text-default-contrast truncate">
            {maybeEns}
          </div>
        </div>
      </div>
    </>}
    <div className="h-4" />
    {/* <div className="flex items-center">
      <button className="text-lg font-medium text-default-contrast data-[active=true]:text-default"
        onClick={onRecentsClick}
        data-active={mode === "recents"}>
        Recents
      </button>
      <div className="grow" />
      <button className="text-lg font-medium text-default-contrast data-[active=true]:text-default"
        onClick={onContactsClick}
        data-active={mode === "contacts"}>
        Contacts
      </button>
    </div>
    <div className="h-2" /> */}
    <div className="po-2 flex items-center bg-default-contrast rounded-xl cursor-pointer"
      role="button"
      onClick={onBrumeClick}>
      <img className="size-12 flex-none rounded-full bg-white p-1"
        src="/favicon.png"
        alt="logo" />
      <div className="w-4" />
      <div className="flex flex-col truncate">
        <div className="font-medium">
          Brume Foundation
        </div>
        <div className="text-default-contrast truncate">
          brume.eth
        </div>
      </div>
    </div>
  </>
}