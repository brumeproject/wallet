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
import { User, UserInit, UserRef } from "@/mods/background/service_worker/entities/users/data";
import { useBackgroundContext } from "@/mods/foreground/background/context";
import { useLocaleContext } from "@/mods/foreground/global/mods/locale";
import { Locale } from "@/mods/foreground/locale";
import { UserAvatar } from "@/mods/foreground/user/mods/avatar";
import { Data } from "@hazae41/glacier";
import { Some } from "@hazae41/option";
import { useCloseContext } from "@hazae41/react-close-context";
import { KeyboardEvent, useCallback, useDeferredValue, useMemo, useState } from "react";
import { SimpleInput } from "../../wallets/actions/send";
import { useCurrentUser } from "../data";

export function UserCreateDialog(props: { next?: string }) {
  const close = useCloseContext().getOrThrow()
  const locale = useLocaleContext().getOrThrow()
  const background = useBackgroundContext().getOrThrow()
  const { next } = props

  const currentUserQuery = useCurrentUser()

  const uuid = useConstant(() => randomUUID())

  const modhash = useModhash(uuid)
  const color = Color.get(modhash)

  const [rawNameInput = "", setRawNameInput] = useState<string>()

  const defNameInput = useDeferredValue(rawNameInput)

  const finalNameInput = useMemo(() => {
    return defNameInput || "John Doe"
  }, [defNameInput])

  const onNameInputChange = useInputChange(e => {
    setRawNameInput(e.currentTarget.value)
  }, [])

  const [rawPasswordInput = "", setRawPasswordInput] = useState<string>()

  const defPasswordInput = useDeferredValue(rawPasswordInput)

  const onPasswordInputChange = useInputChange(e => {
    setRawPasswordInput(e.currentTarget.value)
  }, [])

  const [rawConfirmPasswordInput = "", setRawConfirmPasswordInput] = useState<string>()

  const defConfirmPasswordInput = useDeferredValue(rawConfirmPasswordInput)

  const onConfirmPasswordInputChange = useInputChange(e => {
    setRawConfirmPasswordInput(e.currentTarget.value)
  }, [])

  const createOrAlert = useAsyncUniqueCallback(() => Errors.runOrLogAndAlert(async () => {
    const user: UserInit = { uuid, name: finalNameInput, color: Color.all.indexOf(color), password: defPasswordInput }

    await background.requestOrThrow<User[]>({
      method: "brume_createUser",
      params: [user]
    }).then(r => r.getOrThrow())

    await background.requestOrThrow({
      method: "brume_login",
      params: [user.uuid, defPasswordInput]
    }).then(r => r.getOrThrow())

    await currentUserQuery.mutateOrThrow(() => new Some(new Data(UserRef.create(user.uuid))))

    close(true)

    if (next != null)
      location.assign(next)

    return
  }), [uuid, finalNameInput, color, defPasswordInput, background, close, next])

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Enter")
      return
    e.preventDefault()

    createOrAlert.run()
  }, [createOrAlert])

  const error = useMemo(() => {
    if (defPasswordInput.length < 1)
      return Locale.get(Locale.PasswordRequired, locale)
    if (defPasswordInput.length < 3)
      return Locale.get(Locale.PasswordTooShort, locale)
    if (defConfirmPasswordInput.length < 1)
      return Locale.get(Locale.PasswordRequired, locale)
    if (defConfirmPasswordInput.length < 3)
      return Locale.get(Locale.PasswordTooShort, locale)
    if (defPasswordInput !== defConfirmPasswordInput)
      return Locale.get(Locale.PasswordsDontMatch, locale)
  }, [locale, defConfirmPasswordInput, defPasswordInput])

  const NameInput =
    <ContrastLabel>
      <div className="flex-none">
        {Locale.get(Locale.Name, locale)}
      </div>
      <div className="w-4" />
      <SimpleInput
        placeholder="Myself"
        value={rawNameInput}
        onChange={onNameInputChange} />
    </ContrastLabel>

  const PasswordInput =
    <ContrastLabel>
      <div className="flex-none">
        {Locale.get(Locale.Password, locale)}
      </div>
      <div className="w-4" />
      <SimpleInput
        type="password"
        placeholder=""
        value={rawPasswordInput}
        onChange={onPasswordInputChange} />
    </ContrastLabel>

  const PasswordInput2 =
    <ContrastLabel>
      <div className="flex-none">
        {Locale.get(Locale.Password, locale)}
      </div>
      <div className="w-4" />
      <SimpleInput
        type="password"
        placeholder=""
        value={rawConfirmPasswordInput}
        onChange={onConfirmPasswordInputChange}
        onKeyDown={onKeyDown} />
    </ContrastLabel>

  const DoneButton =
    <WideClickableGradientButton
      disabled={error != null || createOrAlert.loading}
      onClick={createOrAlert.run}
      color={color}>
      <Outline.PlusIcon className="size-5" />
      {error || Locale.get(Locale.Add, locale)}
    </WideClickableGradientButton>

  return <>
    <Dialog.Title>
      {Locale.get(Locale.NewUser, locale)}
    </Dialog.Title>
    <div className="h-4" />
    <div className="grow flex flex-col items-center justify-center h-[200px]">
      <UserAvatar className="size-16 text-2xl"
        name={finalNameInput}
        color={color} />
      <div className="h-2" />
      <div className="font-medium">
        {finalNameInput}
      </div>
    </div>
    <div className="h-2" />
    {NameInput}
    <div className="h-2" />
    {PasswordInput}
    <div className="h-2" />
    {PasswordInput2}
    <div className="h-4" />
    <div className="flex items-center flex-wrap-reverse gap-2">
      {DoneButton}
    </div>
  </>
}