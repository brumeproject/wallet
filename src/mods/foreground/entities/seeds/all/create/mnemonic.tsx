import { Color } from "@/libs/colors/colors";
import { Errors } from "@/libs/errors/errors";
import { Outline } from "@/libs/icons";
import { useModhash } from "@/libs/modhash/modhash";
import { isSafariExtension } from "@/libs/platform/platform";
import { useAsyncUniqueCallback } from "@/libs/react/callback";
import { useInputChange, useTextAreaChange } from "@/libs/react/events";
import { useAsyncReplaceMemo } from "@/libs/react/memo";
import { useConstant } from "@/libs/react/ref";
import { WideClickableContrastButton, WideClickableGradientButton } from "@/libs/ui/button";
import { Dialog } from "@/libs/ui/dialog";
import { ContrastLabel } from "@/libs/ui/label";
import { randomUUID } from "@/libs/uuid/uuid";
import { useBackgroundContext } from "@/mods/foreground/background/context";
import { useLocaleContext } from "@/mods/foreground/global/mods/locale";
import { Locale } from "@/mods/foreground/locale";
import { SeedData } from "@/mods/universal/entities/seeds";
import { Base64 } from "@hazae41/base64";
import { Bytes } from "@hazae41/bytes";
import { useCloseContext } from "@hazae41/react-close-context";
import { Panic, Result } from "@hazae41/result";
import { WebAuthnStorage } from "@hazae41/webauthnstorage";
import { generateMnemonic, mnemonicToEntropy, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { SimpleInput, SimpleTextarea } from "../../../wallets/actions/send";
import { RawSeedCard } from "../../card";

export function StandaloneSeedCreatorDialog(props: {}) {
  const close = useCloseContext().getOrThrow()
  const locale = useLocaleContext().getOrThrow()
  const background = useBackgroundContext().getOrThrow()

  const uuid = useConstant(() => randomUUID())

  const modhash = useModhash(uuid)
  const color = Color.get(modhash)

  const [rawNameInput = "", setRawNameInput] = useState<string>()

  const defNameInput = useDeferredValue(rawNameInput)

  const onNameInputChange = useInputChange(e => {
    setRawNameInput(e.currentTarget.value)
  }, [])

  const [rawPhraseInput = "", setRawPhraseInput] = useState<string>()

  const defPhraseInput = useDeferredValue(rawPhraseInput)

  const onPhraseInputChange = useTextAreaChange(e => {
    setRawPhraseInput(e.currentTarget.value)
  }, [])

  const generate12OrAlert = useCallback(() => Errors.runAndLogAndAlertSync(() => {
    setRawPhraseInput(generateMnemonic(wordlist, 128))
  }), [])

  const generate24OrAlert = useCallback(() => Errors.runAndLogAndAlertSync(() => {
    setRawPhraseInput(generateMnemonic(wordlist, 256))
  }), [])

  const addUnauthenticatedOrAlert = useAsyncUniqueCallback(() => Errors.runOrLogAndAlert(async () => {
    if (!defNameInput)
      throw new Panic()
    if (!defPhraseInput)
      throw new Panic()
    if (!isSafariExtension() && confirm("Did you backup your seed phrase?") === false)
      return

    const seed: SeedData = { type: "mnemonic", uuid, name: defNameInput, color: Color.all.indexOf(color), mnemonic: defPhraseInput }

    await background.requestOrThrow<void>({
      method: "brume_createSeed",
      params: [seed]
    }).then(r => r.getOrThrow())

    close()
  }), [defNameInput, defPhraseInput, uuid, color, background, close])

  const triedEncryptedPhrase = useAsyncReplaceMemo(() => Result.runAndWrap(async () => {
    if (!defNameInput)
      throw new Panic()
    if (!defPhraseInput)
      throw new Panic()

    const entropyBytes = mnemonicToEntropy(defPhraseInput, wordlist)
    const entropyBase64 = Base64.get().getOrThrow().encodePaddedOrThrow(entropyBytes)

    const [ivBase64, cipherBase64] = await background.requestOrThrow<[string, string]>({
      method: "brume_encrypt",
      params: [entropyBase64]
    }).then(r => r.getOrThrow())

    return [ivBase64, cipherBase64]
  }), [defNameInput, defPhraseInput, background])

  const [id, setId] = useState<Uint8Array>()

  useEffect(() => {
    setId(undefined)
  }, [defPhraseInput])

  const addAuthenticatedOrAlert1 = useAsyncUniqueCallback(() => Errors.runOrLogAndAlert(async () => {
    if (!defNameInput)
      throw new Panic()
    if (triedEncryptedPhrase == null)
      throw new Panic()
    if (!isSafariExtension() && confirm("Did you backup your seed phrase?") === false)
      return

    const [_, cipherBase64] = triedEncryptedPhrase.getOrThrow()

    using cipherMemory = Base64.get().getOrThrow().decodePaddedOrThrow(cipherBase64)

    const idBytes = await WebAuthnStorage.createOrThrow(defNameInput, cipherMemory.bytes)

    setId(idBytes)
  }), [defNameInput, triedEncryptedPhrase])

  const addAuthenticatedOrAlert2 = useAsyncUniqueCallback(() => Errors.runOrLogAndAlert(async () => {
    if (id == null)
      throw new Panic()
    if (!defNameInput)
      throw new Panic()
    if (triedEncryptedPhrase == null)
      throw new Panic()

    const [ivBase64, cipherBase64] = triedEncryptedPhrase.getOrThrow()

    using cipherMemory = Base64.get().getOrThrow().decodePaddedOrThrow(cipherBase64)
    const cipherBytes = await WebAuthnStorage.getOrThrow(id)

    if (!Bytes.equals(cipherMemory.bytes, cipherBytes))
      throw new Error(`Corrupt storage`)

    const idBase64 = Base64.get().getOrThrow().encodePaddedOrThrow(id)
    const mnemonic = { ivBase64, idBase64 }

    const seed: SeedData = { type: "authMnemonic", uuid, name: defNameInput, color: Color.all.indexOf(color), mnemonic }

    await background.requestOrThrow<void>({
      method: "brume_createSeed",
      params: [seed]
    }).then(r => r.getOrThrow())

    close()
  }), [id, defNameInput, triedEncryptedPhrase, uuid, color, background, close])

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

  const PhraseInput =
    <div className="po-2 flex flex-col bg-default-contrast rounded-xl">
      <div className="flex items-start">
        <div className="flex-none">
          {Locale.get(Locale.MnemonicPhrase, locale)}
        </div>
        <div className="w-4" />
        <SimpleTextarea
          placeholder="candy climb cloth fetch crack miss gift direct then fork prevent already increase slam code"
          value={rawPhraseInput}
          onChange={onPhraseInputChange}
          rows={5} />
      </div>
      <div className="h-2" />
      <div className="flex items-center flex-wrap-reverse gap-2">
        <WideClickableContrastButton
          onClick={generate12OrAlert}>
          <Outline.KeyIcon className="size-5" />
          {Locale.get(Locale.Generate12Words, locale)}
        </WideClickableContrastButton>
        <WideClickableContrastButton
          onClick={generate24OrAlert}>
          <Outline.KeyIcon className="size-5" />
          {Locale.get(Locale.Generate24Words, locale)}
        </WideClickableContrastButton>
      </div>
    </div>

  const error = useMemo(() => {
    if (!validateMnemonic(defPhraseInput, wordlist))
      return Locale.get(Locale.ValidMnemonicPhraseRequired, locale)
    return
  }, [defPhraseInput])

  const AddUnauthButton =
    <WideClickableContrastButton
      disabled={error != null || addUnauthenticatedOrAlert.loading}
      onClick={addUnauthenticatedOrAlert.run}>
      <Outline.PlusIcon className="size-5" />
      {error || Locale.get(Locale.AddWithoutAuthentication, locale)}
    </WideClickableContrastButton>

  const AddAuthButton1 =
    <WideClickableGradientButton
      color={color}
      disabled={error != null || addAuthenticatedOrAlert1.loading}
      onClick={addAuthenticatedOrAlert1.run}>
      <Outline.LockClosedIcon className="size-5" />
      {error && error}
      {!error && <>
        <span>
          {Locale.get(Locale.AddWithAuthentication, locale)}
        </span>
        <span className="rtl:hidden">
          (1/2)
        </span>
        <span className="ltr:hidden">
          (2/1)
        </span>
      </>}
    </WideClickableGradientButton>

  const AddAuthButton2 =
    <WideClickableGradientButton
      color={color}
      disabled={error != null || addAuthenticatedOrAlert2.loading}
      onClick={addAuthenticatedOrAlert2.run}>
      <Outline.LockClosedIcon className="size-5" />
      {error && error}
      {!error && <>
        <span>
          {Locale.get(Locale.AddWithAuthentication, locale)}
        </span>
        <span>
          (2/2)
        </span>
      </>}
    </WideClickableGradientButton>

  return <>
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
      <div className="h-2" />
      {PhraseInput}
      <div className="h-4" />
      <div className="flex items-center flex-wrap-reverse gap-2">
        {AddUnauthButton}
        {id == null
          ? AddAuthButton1
          : AddAuthButton2}
      </div>
    </div>
  </>
}