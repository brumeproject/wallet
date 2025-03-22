import { Outline } from "@/libs/icons";
import { Dialog } from "@/libs/ui/dialog";
import { ContrastTitleDiv } from "@/libs/ui/div";
import { ClickerInAnchorDiv, GapperAndClickerInAnchorDiv } from "@/libs/ui/shrinker";
import { HashSubpathProvider, PathHandle, useCoords, useHashSubpath, usePathContext } from "@hazae41/chemin";
import { ChangeEvent, KeyboardEvent, useCallback, useDeferredValue, useMemo, useState } from "react";
import { useAppRequests } from "../entities/requests/data";
import { useLocaleContext } from "../global/mods/locale";
import { Locale } from "../locale";

export function asUrlOrNull(text: string) {
  if (text.startsWith("http://"))
    return new URL(text)

  if (text.startsWith("https://"))
    return new URL(text)

  const match = /(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/.exec(text)

  if (match == null)
    return
  if (match.index !== 0)
    return

  return new URL(`https://${text}`)
}

export function OmniDialog(props: {
  readonly path: PathHandle
}) {
  const locale = useLocaleContext().getOrThrow()
  const { path } = props

  const requestsQuery = useAppRequests()
  const requests = requestsQuery.data?.get()

  const [rawInput = "", setRawInput] = useState<string>()

  const onInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setRawInput(e.target.value)
  }, [])

  const defInput = useDeferredValue(rawInput)

  const maybeWebsite = useMemo(() => {
    return asUrlOrNull(defInput)
  }, [defInput])

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter")
      return
    e.preventDefault()

    if (maybeWebsite == null)
      return
    const website = maybeWebsite

    window.open(website, "_blank", "noreferrer")
  }, [path, maybeWebsite])

  return <Dialog>
    <div className="po-2 bg-default-contrast rounded-xl">
      <div className="flex items-center">
        <Outline.SparklesIcon className="size-4" />
        <div className="w-2" />
        <input className="w-full bg-transparent outline-none"
          placeholder={Locale.get(Locale.tellMeWhatYouWant, locale)}
          value={rawInput}
          onChange={onInputChange}
          onKeyDown={onKeyDown} />
      </div>
      {maybeWebsite != null && <>
        <div className="h-2" />
        <a className="flex items-center"
          target="_blank"
          rel="noreferrer"
          href={maybeWebsite.href}>
          <Outline.GlobeAltIcon className="size-4" />
          <div className="w-2" />
          {defInput}
        </a>
      </>}
    </div>
    <div className="h-4" />
    <ContrastTitleDiv>
      {Locale.get(Locale.User, locale)}
    </ContrastTitleDiv>
    <div className="h-4" />
    <div className="grid place-content-start gap-2 grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]">
      <a className="po-2 bg-default-contrast rounded-xl"
        data-selected={path.url.pathname === "/home"}
        href="#/home">
        <Outline.HomeIcon className="size-5" />
        <div className="h-4" />
        {Locale.get(Locale.Home, locale)}
      </a>
      <a className="po-2 bg-default-contrast rounded-xl"
        data-selected={path.url.pathname === "/wallets"}
        href="#/wallets">
        <Outline.WalletIcon className="size-5" />
        <div className="h-4" />
        {Locale.get(Locale.Wallets, locale)}
      </a>
      <a className="po-2 bg-default-contrast rounded-xl"
        data-selected={path.url.pathname === "/seeds"}
        href="#/seeds">
        <Outline.SparklesIcon className="size-5" />
        <div className="h-4" />
        {Locale.get(Locale.Seeds, locale)}
      </a>
      <a className="po-2 bg-default-contrast rounded-xl"
        data-selected={path.url.pathname === "/sessions"}
        href="#/sessions">
        <Outline.GlobeAltIcon className="size-5" />
        <div className="h-4" />
        {Locale.get(Locale.Sessions, locale)}
      </a>
      <a className="po-2 bg-default-contrast rounded-xl"
        data-selected={path.url.pathname === "/requests"}
        href="#/requests">
        <ClickerInAnchorDiv>
          <div className="relative">
            {Boolean(requests?.length) &&
              <div className="absolute top-0 -right-2">
                <span className="relative flex w-2 h-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full w-2 h-2 bg-purple-400" />
                </span>
              </div>}
            <Outline.CheckIcon className="size-5" />
          </div>
          <div className="h-4" />
          {Locale.get(Locale.Requests, locale)}
        </ClickerInAnchorDiv>
      </a>
      <a className="po-2 bg-default-contrast rounded-xl"
        data-selected={path.url.pathname === "/settings"}
        href="#/settings">
        <Outline.CogIcon className="size-5" />
        <div className="h-4" />
        {Locale.get(Locale.Settings, locale)}
      </a>
    </div>
    <div className="h-4" />
    <ContrastTitleDiv>
      {Locale.get(Locale.Global, locale)}
    </ContrastTitleDiv>
    <div className="h-4" />
    <div className="grid place-content-start gap-2 grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]">
      <a className="po-2 bg-default-contrast rounded-xl"
        data-selected={path.url.pathname === "/"}
        href="#/">
        <Outline.BuildingStorefrontIcon className="size-5" />
        <div className="h-4" />
        {Locale.get(Locale.Showcase, locale)}
      </a>
      {/* <a className="po-2 bg-default-contrast rounded-xl"
        data-selected={path.url.pathname === "/apps"}
        href="#/apps">
        <Outline.GlobeAltIcon className="size-5" />
        <div className="h-4" />
        Apps
      </a> */}
    </div>
  </Dialog>
}

export function UserBottomNavigation() {
  const path = usePathContext().getOrThrow()

  const hash = useHashSubpath(path)

  const requestsQuery = useAppRequests()
  const requestsData = requestsQuery.data?.get()

  const omnidialog = useCoords(hash, "/...")

  return <nav className="md:hidden h-16 w-full flex-none border-t border-t-default-contrast">
    <HashSubpathProvider>
      {hash.url.pathname === "/..." &&
        <OmniDialog path={path} />}
    </HashSubpathProvider>
    <div className="w-full h-16 px-4 m-auto max-w-3xl flex items-center">
      {/* <a className={`group flex-1 text-default-contrast data-[selected=true]:text-default`}
        data-selected={path.url.pathname === "/home"}
        href="#/home">
        <GapperAndClickerInAnchorDiv>
          <Outline.HomeIcon className="size-6" />
        </GapperAndClickerInAnchorDiv>
      </a>
      <a className={`group flex-1 text-default-contrast data-[selected=true]:text-default`}
        data-selected={path.url.pathname === "/wallets"}
        href="#/wallets">
        <GapperAndClickerInAnchorDiv>
          <Outline.WalletIcon className="size-6" />
        </GapperAndClickerInAnchorDiv>
      </a>
      <a className={`group flex-1 text-default-contrast data-[selected=true]:text-default`}
        data-selected={path.url.pathname === "/seeds"}
        href="#/seeds">
        <GapperAndClickerInAnchorDiv>
          <Outline.SparklesIcon className="size-6" />
        </GapperAndClickerInAnchorDiv>
      </a> */}
      <div className="flex-1 flex items-center justify-center">
        <a className="group po-2 bg-opposite rounded-full text-opposite"
          href={omnidialog.href}
          onClick={omnidialog.onClick}
          onKeyDown={omnidialog.onKeyDown}>
          <GapperAndClickerInAnchorDiv>
            <Outline.EllipsisHorizontalIcon className="size-6" />
          </GapperAndClickerInAnchorDiv>
        </a>
      </div>
      {/* <a className="group flex-1 text-default-contrast data-[selected=true]:text-default"
        data-selected={path.url.pathname === "/sessions"}
        href="#/sessions">
        <GapperAndClickerInAnchorDiv>
          <Outline.GlobeAltIcon className="size-6" />
        </GapperAndClickerInAnchorDiv>
      </a> */}
      {/* <a className="group flex-1 text-default-contrast data-[selected=true]:text-default"
        data-selected={path.url.pathname === "/requests"}
        href="#/requests">
        <GapperAndClickerInAnchorDiv>
          <div className="relative">
            {Boolean(requestsData?.length) &&
              <div className="absolute top-0 -right-2">
                <span className="relative flex w-2 h-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full w-2 h-2 bg-purple-400" />
                </span>
              </div>}
            <Outline.CheckIcon className="size-6" />
          </div>
        </GapperAndClickerInAnchorDiv>
      </a> */}
      {/* <a className="group flex-1 text-default-contrast data-[selected=true]:text-default"
        data-selected={path.url.pathname === "/settings"}
        href="#/settings">
        <GapperAndClickerInAnchorDiv>
          <Outline.CogIcon className="size-6" />
        </GapperAndClickerInAnchorDiv>
      </a> */}
    </div>
  </nav>
}

export function GlobalBottomNavigation() {
  const path = usePathContext().getOrThrow()

  const hash = useHashSubpath(path)

  const omnidialog = useCoords(hash, "/...")

  return <nav className="md:hidden h-16 w-full flex-none border-t border-t-default-contrast">
    <HashSubpathProvider>
      {hash.url.pathname === "/..." &&
        <OmniDialog path={path} />}
    </HashSubpathProvider>
    <div className="w-full h-16 px-4 m-auto max-w-3xl flex items-center">
      {/* <a className={`group flex-1 text-default-contrast data-[selected=true]:text-default`}
        data-selected={path.url.pathname === "/"}
        href="#/">
        <GapperAndClickerInAnchorDiv>
          <Outline.RocketLaunchIcon className="size-6" />
        </GapperAndClickerInAnchorDiv>
      </a> */}
      <div className="flex-1 flex items-center justify-center">
        <a className="group po-2 bg-opposite rounded-full text-opposite"
          href={omnidialog.href}
          onClick={omnidialog.onClick}
          onKeyDown={omnidialog.onKeyDown}>
          <GapperAndClickerInAnchorDiv>
            <Outline.EllipsisHorizontalIcon className="size-6" />
          </GapperAndClickerInAnchorDiv>
        </a>
      </div>
    </div>
  </nav>
}