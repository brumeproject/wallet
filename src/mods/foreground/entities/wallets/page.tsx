/* eslint-disable @next/next/no-img-element */
import { Color } from "@/libs/colors/colors";
import { Errors, UIError } from "@/libs/errors/errors";
import { ChainData, chainDataByChainId, pairByAddress, SimplePairDataV3, tokenByAddress } from "@/libs/ethereum/mods/chain";
import { Mutators } from "@/libs/glacier/mutators";
import { Outline, Solid } from "@/libs/icons/icons";
import { useModhash } from "@/libs/modhash/modhash";
import { useAsyncUniqueCallback } from "@/libs/react/callback";
import { useBooleanHandle } from "@/libs/react/handles/boolean";
import { AnchorProps } from "@/libs/react/props/html";
import { OkProps } from "@/libs/react/props/promise";
import { UUIDProps } from "@/libs/react/props/uuid";
import { State } from "@/libs/react/state";
import { Dialog } from "@/libs/ui/dialog";
import { SmallUnflexLoading } from "@/libs/ui/loading";
import { Menu } from "@/libs/ui/menu";
import { PageBody, UserPageHeader } from "@/libs/ui/page/header";
import { Page } from "@/libs/ui/page/page";
import { AnchorShrinkerDiv } from "@/libs/ui/shrinker";
import { randomUUID } from "@/libs/uuid/uuid";
import { ContractToken, ContractTokenData, NativeToken, NativeTokenData, Token, TokenData, TokenRef } from "@/mods/background/service_worker/entities/tokens/data";
import { WalletRef } from "@/mods/background/service_worker/entities/wallets/data";
import { TokenSettings, TokenSettingsData } from "@/mods/background/service_worker/entities/wallets/tokens/data";
import { HashSubpathProvider, useCoords, useHashSubpath, usePathContext } from "@hazae41/chemin";
import { Fixed, ZeroHexString } from "@hazae41/cubane";
import { Data, Fail, Fetched } from "@hazae41/glacier";
import { Wc, WcMetadata } from "@hazae41/latrine";
import { None, Nullable, Option, Optional, Some } from "@hazae41/option";
import { CloseContext, useCloseContext } from "@hazae41/react-close-context";
import { Result } from "@hazae41/result";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useBackgroundContext } from "../../background/context";
import { useEnsReverse } from "../names/data";
import { usePairV2Price, usePairV3Price } from "../pairs/data";
import { TokenAddDialog } from "../tokens/add/dialog";
import { useContractBalance, useContractPricedBalance, useNativeBalance, useNativePricedBalance, useToken, useTokens } from "../tokens/data";
import { SmallShrinkableContrastButton } from "../users/all/page";
import { WalletEditDialog } from "./actions/edit";
import { WalletDataReceiveScreen } from "./actions/receive/receive";
import { PaddedRoundedShrinkableNakedAnchor, WalletSendScreen, WideShrinkableNakedMenuAnchor, WideShrinkableNakedMenuButton } from "./actions/send";
import { RawWalletDataCard } from "./card";
import { useWalletDataContext, WalletDataProvider } from "./context";
import { EthereumWalletInstance, useEthereumContext, useWallet } from "./data";
import { useTokenSettings, useTokenSettingsByWallet } from "./tokens/data";

export function WalletPage(props: UUIDProps) {
  const { uuid } = props

  return <WalletDataProvider uuid={uuid}>
    <WalletDataPage />
  </WalletDataProvider>
}

export function useDisplayRaw(fixed: Fixed.From = new Fixed(0n, 18)) {
  return useMemo(() => {
    const fixed5 = Fixed.from(fixed).move(18)
    const float = Number(fixed5.toString())

    return float.toLocaleString(undefined)
  }, [fixed])
}

export function useDisplayUsd(fixed: Fixed.From = new Fixed(0n, 2)) {
  return useMemo(() => {
    const fixed2 = Fixed.from(fixed).move(2)
    const float = Number(fixed2.toString())

    const style = "currency"
    const currency = "USD"
    const notation = "standard"

    return float.toLocaleString(undefined, { style, currency, notation })
  }, [fixed])
}

export function useCompactDisplayUsd(fixed: Fixed.From = new Fixed(0n, 2)) {
  return useMemo(() => {
    const fixed2 = Fixed.from(fixed).move(2)
    const float = Number(fixed2.toString())

    const style = "currency"
    const currency = "USD"
    const notation = "compact"

    return float.toLocaleString(undefined, { style, currency, notation })
  }, [fixed])
}

export function AnchorCard(props: AnchorProps) {
  const { children, ...rest } = props

  return <a className="grow group p-4 bg-contrast rounded-xl cursor-pointer focus:outline-black focus:outline-1"
    {...rest}>
    <AnchorShrinkerDiv>
      {children}
    </AnchorShrinkerDiv>
  </a>
}

function WalletDataPage() {
  const path = usePathContext().getOrThrow()
  const wallet = useWalletDataContext().getOrThrow()

  const subpath = useHashSubpath(path)

  const mainnet = useEthereumContext(wallet.uuid, chainDataByChainId[1]).getOrThrow()

  useEnsReverse(wallet.address, mainnet)

  const [all, setAll] = useState(false)
  const [edit, setEdit] = useState(false)
  const add = useBooleanHandle(false)

  const walletTokens = useTokenSettingsByWallet(wallet)
  const userTokens = useTokens()

  const allTokens = useMemo<TokenData[]>(() => {
    const natives = Object.values(chainDataByChainId).map(x => x.token)
    const contracts = Object.values(tokenByAddress)
    const all = [...natives, ...contracts]
    return all.sort((a, b) => a.chainId - b.chainId)
  }, [])

  const onBackClick = useCallback(() => {
    location.assign("#/wallets")
  }, [])

  const connect = useCoords(subpath, "/connect")
  const receive = useCoords(subpath, "/receive")

  const $flip = useState(false)
  const [flip, setFlip] = $flip

  const $privateKey = useState<Optional<ZeroHexString>>()
  const [privateKey, setPrivateKey] = $privateKey

  const onUnflip = useCallback(() => {
    setPrivateKey(undefined)
    setFlip(false)
  }, [setFlip, setPrivateKey])

  const Header =
    <UserPageHeader
      title="Wallet"
      back={onBackClick}>
      <div className="flex items-center gap-2">
        <PaddedRoundedShrinkableNakedAnchor
          onKeyDown={connect.onKeyDown}
          onClick={connect.onClick}
          href={connect.href}>
          <img className="size-5"
            alt="WalletConnect"
            src="/assets/wc.svg" />
        </PaddedRoundedShrinkableNakedAnchor>
      </div>
    </UserPageHeader>

  const Card =
    <div className="p-4 flex justify-center">
      <div className="w-full max-w-sm">
        <div className="w-full aspect-video rounded-xl">
          <RawWalletDataCard
            privateKey={privateKey}
            flip={flip}
            unflip={onUnflip}
            href="/menu" />
        </div>
        {wallet.type === "readonly" && <>
          <div className="h-2" />
          <div className="po-sm bg-contrast text-contrast rounded-xl flex items-center justify-center">
            <Outline.EyeIcon className="size-5" />
            <div className="w-2" />
            <div>
              This is a watch-only wallet
            </div>
          </div>
        </>}
      </div>
    </div>

  const Apps =
    <div className="po-md grid place-content-start gap-2 grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]">
      <AnchorCard>
        <Outline.BanknotesIcon className="size-4" />
        Tokens
      </AnchorCard>
      <AnchorCard>
        <Outline.PaperAirplaneIcon className="size-4" />
        Transactions
      </AnchorCard>
      <AnchorCard
        onKeyDown={receive.onKeyDown}
        onClick={receive.onClick}
        href={receive.href}>
        <Outline.QrCodeIcon className="size-4" />
        Receive
      </AnchorCard>
      <AnchorCard>
        <Outline.TrophyIcon className="size-4" />
        NFTs
      </AnchorCard>
      <AnchorCard>
        <Outline.LinkIcon className="size-4" />
        Links
      </AnchorCard>
      <AnchorCard>
        <Outline.CheckIcon className="size-4" />
        Approvals
      </AnchorCard>
    </div>

  const Body =
    <PageBody>
      {add.current &&
        <CloseContext.Provider value={add.disable}>
          <Dialog>
            <TokenAddDialog />
          </Dialog>
        </CloseContext.Provider>}
      <div className="font-medium text-xl">
        Tokens
      </div>
      <div className="h-4" />
      <div className="flex flex-col gap-4">
        <TokenRowRouter token={chainDataByChainId[1].token} />
        {!edit && walletTokens.data?.get().map(tokenSettings =>
          <AddedTokenRow
            key={tokenSettings.uuid}
            settingsRef={tokenSettings} />)}
      </div>
      <div className="h-4" />
      <div className="flex items-center gap-2">
        <SmallShrinkableContrastButton
          onClick={() => setAll(!all)}>
          {all
            ? <Outline.ChevronUpIcon className="size-5" />
            : <Outline.ChevronDownIcon className="size-5" />}
          {all ? "Show less" : "Show more"}
        </SmallShrinkableContrastButton>
        <div className="grow" />
        {all && <>
          <SmallShrinkableContrastButton
            onClick={add.enable}>
            <Outline.PlusIcon className="size-5" />
            {"Add"}
          </SmallShrinkableContrastButton>
        </>}
      </div>
      <div className="h-4" />
      {all &&
        <div className="flex flex-col gap-4">
          {allTokens.map(token =>
            <Fragment key={token.uuid}>
              {token.uuid !== chainDataByChainId[1].token.uuid &&
                <UnaddedTokenRow token={token} />}
            </Fragment>)}
          {userTokens.data?.get().map(token =>
            <UnaddedTokenRow
              key={token.uuid}
              token={token} />)}
        </div>}
    </PageBody>

  return <Page>
    <HashSubpathProvider>
      {subpath.url.pathname === "/connect" &&
        <Menu>
          <WalletConnectMenu />
        </Menu>}
      {subpath.url.pathname === "/send" &&
        <Dialog>
          <WalletSendScreen />
        </Dialog>}
      {subpath.url.pathname === "/edit" &&
        <Dialog>
          <WalletEditDialog />
        </Dialog>}
      {subpath.url.pathname === "/receive" &&
        <Dialog dark>
          <WalletDataReceiveScreen />
        </Dialog>}
      {subpath.url.pathname === "/menu" &&
        <Menu>
          <WalletMenu
            $privateKey={$privateKey}
            $flip={$flip} />
        </Menu>}
    </HashSubpathProvider>
    {Header}
    {Card}
    {Apps}
    {Body}
  </Page>
}

export function WalletMenu(props: {
  $flip: State<boolean>,
  $privateKey: State<Optional<ZeroHexString>>
}) {
  const path = usePathContext().getOrThrow()
  const wallet = useWalletDataContext().getOrThrow()
  const background = useBackgroundContext().getOrThrow()
  const close = useCloseContext().getOrThrow()
  const { $flip, $privateKey } = props

  const [flip, setFlip] = $flip
  const [privateKey, setPrivateKey] = $privateKey

  const edit = useCoords(path, "/edit")

  const flipOrAlert = useAsyncUniqueCallback(() => Errors.runAndLogAndAlert(async () => {
    const instance = await EthereumWalletInstance.createOrThrow(wallet, background)
    const privateKey = await instance.getPrivateKeyOrThrow(background)

    setPrivateKey(privateKey)
    setFlip(true)

    close()
  }), [background, close, setFlip, setPrivateKey, wallet])

  const onUnflipClick = useCallback(async () => {
    setFlip(false)

    close()
  }, [close, setFlip])

  const walletQuery = useWallet(wallet.uuid)

  const trashOrAlert = useAsyncUniqueCallback(() => Errors.runAndLogAndAlert(async () => {
    await walletQuery.mutate(s => {
      const current = s.real?.current

      if (current == null)
        return new None()
      if (current.isErr())
        return new None()

      return new Some(current.mapSync(w => ({ ...w, trashed: true })).setTimes({ ...current, expiration: Date.now() + 30 * 24 * 60 * 15 * 1000 }))
    })

    close()
  }), [close, walletQuery])

  const untrashOrAlert = useAsyncUniqueCallback(() => Errors.runAndLogAndAlert(async () => {
    await walletQuery.mutate(s => {
      const current = s.real?.current

      if (current == null)
        return new None()
      if (current.isErr())
        return new None()

      return new Some(current.mapSync(w => ({ ...w, trashed: undefined })).setTimes({ ...current, expiration: undefined }))
    })

    close()
  }), [close, walletQuery])

  return <div className="flex flex-col text-left gap-2">
    <WideShrinkableNakedMenuAnchor
      onClick={edit.onClick}
      onKeyDown={edit.onKeyDown}
      href={edit.href}>
      <Outline.PencilIcon className="size-4" />
      Edit
    </WideShrinkableNakedMenuAnchor>
    {!privateKey &&
      <WideShrinkableNakedMenuButton
        disabled={flipOrAlert.loading}
        onClick={flipOrAlert.run}>
        <Outline.EyeIcon className="size-4" />
        Flip
      </WideShrinkableNakedMenuButton>}
    {privateKey &&
      <WideShrinkableNakedMenuButton
        onClick={onUnflipClick}>
        <Outline.EyeSlashIcon className="size-4" />
        Unflip
      </WideShrinkableNakedMenuButton>}
    {!wallet.trashed &&
      <WideShrinkableNakedMenuButton
        disabled={trashOrAlert.loading}
        onClick={trashOrAlert.run}>
        <Outline.TrashIcon className="size-4" />
        Trash
      </WideShrinkableNakedMenuButton>}
    {wallet.trashed &&
      <WideShrinkableNakedMenuButton
        disabled={untrashOrAlert.loading}
        onClick={untrashOrAlert.run}>
        <Outline.TrashIcon className="size-4" />
        Untrash
      </WideShrinkableNakedMenuButton>}
  </div>
}

export function WalletConnectMenu() {
  const wallet = useWalletDataContext().getOrThrow()
  const background = useBackgroundContext().getOrThrow()
  const close = useCloseContext().getOrThrow()

  const connectOrAlert = useAsyncUniqueCallback(() => Errors.runAndLogAndAlert(async () => {
    const clipboard = await Result.runAndWrap(async () => {
      return await navigator.clipboard.readText()
    }).then(r => r.orElseSync(() => {
      return Option.wrap(prompt("Paste a WalletConnect link here")).ok()
    }).getOrThrow())

    const url = Result.runAndWrapSync(() => {
      return new URL(clipboard)
    }).mapErrSync(() => {
      return new UIError("You must copy a WalletConnect link")
    }).getOrThrow()

    Result.runAndWrapSync(() => {
      return Wc.parseOrThrow(url)
    }).mapErrSync(() => {
      return new UIError("You must copy a WalletConnect link")
    }).getOrThrow()

    alert(`Connecting...`)

    const metadata = await background.requestOrThrow<WcMetadata>({
      method: "brume_wc_connect",
      params: [clipboard, wallet.uuid]
    }).then(r => r.getOrThrow())

    alert(`Connected to ${metadata.name}`)

    close()
  }), [wallet, background, close])

  return <div className="flex flex-col text-left gap-2">
    <WideShrinkableNakedMenuAnchor
      href={`#/wallet/${wallet.uuid}/camera`}>
      <Outline.QrCodeIcon className="size-4" />
      Scan
    </WideShrinkableNakedMenuAnchor>
    <WideShrinkableNakedMenuButton
      disabled={connectOrAlert.loading}
      onClick={connectOrAlert.run}>
      <Outline.LinkIcon className="size-4" />
      Paste
    </WideShrinkableNakedMenuButton>
  </div>
}

function AddedTokenRow(props: { settingsRef: TokenSettings }) {
  const wallet = useWalletDataContext().getOrThrow()

  const { settingsRef } = props
  const { token } = settingsRef

  const settings = useTokenSettings(wallet, token)

  if (token.type === "native" && token.chainId === 1)
    return null
  if (!settings.data?.get().enabled)
    return null
  return <TokenRowRouter token={settings.data.get().token} />
}

function UnaddedTokenRow(props: { token: Token }) {
  const wallet = useWalletDataContext().getOrThrow()
  const { token } = props

  const settings = useTokenSettings(wallet, token)

  if (settings.data?.get().enabled)
    return null
  return <TokenRowRouter token={token} />
}

function TokenRowRouter(props: { token: Token }) {
  const { token } = props

  if (token.type === "native")
    return <NativeTokenResolver token={token} />
  if (token.type === "contract")
    return <ContractTokenResolver token={token} />
  return null
}

function NativeTokenResolver(props: { token: NativeToken }) {
  const { token } = props

  const chainData = chainDataByChainId[token.chainId]
  const tokenData = chainData.token

  return <NativeTokenRow
    token={tokenData}
    chain={chainData} />
}

function ContractTokenResolver(props: { token: ContractToken }) {
  const { token } = props

  const tokenQuery = useToken(token.chainId, token.address)
  const tokenData = tokenQuery.data?.get() ?? tokenByAddress[token.address]
  const chainData = chainDataByChainId[token.chainId]

  if (tokenData == null)
    return null

  return <ContractTokenRow
    token={tokenData}
    chain={chainData} />
}

function NativeTokenMenu(props: { token: NativeTokenData }) {
  const close = useCloseContext().getOrThrow()
  const wallet = useWalletDataContext().getOrThrow()
  const path = usePathContext().getOrThrow()
  const { token } = props

  const send = useCoords(path, `/send?step=target&chain=${token.chainId}`)

  const settings = useTokenSettings(wallet, token)
  const favorite = settings.data?.get().enabled

  const onToggle = useAsyncUniqueCallback(() => Errors.runAndLogAndAlert(async () => {
    const enabled = !favorite

    await settings.mutate(s => {
      const data = Mutators.Datas.mapOrNew((d = {
        uuid: randomUUID(),
        token: TokenRef.from(token),
        wallet: WalletRef.from(wallet),
        enabled
      }): TokenSettingsData => {
        return { ...d, enabled }
      }, s.real?.data)

      return new Some(data)
    })

    close(true)
  }), [favorite, settings, token, wallet, close])

  return <div className="flex flex-col text-left gap-2">
    <WideShrinkableNakedMenuButton
      onClick={onToggle.run}>
      {favorite ? <Solid.StarIcon className="size-4" /> : <Outline.StarIcon className="size-4" />}
      {favorite ? "Unfavorite" : "Favorite"}
    </WideShrinkableNakedMenuButton>
    <WideShrinkableNakedMenuAnchor
      aria-disabled={wallet.type === "readonly"}
      onClick={send.onClick}
      onKeyDown={send.onKeyDown}
      href={send.href}>
      <Outline.PaperAirplaneIcon className="size-4" />
      Send
    </WideShrinkableNakedMenuAnchor>
    <WideShrinkableNakedMenuAnchor
      aria-disabled>
      <Outline.BanknotesIcon className="size-4" />
      Faucet
    </WideShrinkableNakedMenuAnchor>
  </div>
}

function NativeTokenRow(props: { token: NativeTokenData } & { chain: ChainData }) {
  const path = usePathContext().getOrThrow()
  const wallet = useWalletDataContext().getOrThrow()
  const { token, chain } = props

  const subpath = useHashSubpath(path)
  const menu = useCoords(subpath, `/token/${token.chainId}`)

  const context = useEthereumContext(wallet.uuid, chain).getOrThrow()

  const [prices, setPrices] = useState(new Array<Nullable<Fixed.From>>(token.pairs?.length ?? 0))

  const balanceQuery = useNativeBalance(wallet.address, "pending", context, prices)
  const balanceUsdQuery = useNativePricedBalance(wallet.address, "usd", context)

  const onPrice = useCallback(([index, data]: [number, Nullable<Fixed.From>]) => {
    setPrices(prices => {
      prices[index] = data
      return [...prices]
    })
  }, [])

  return <>
    <HashSubpathProvider>
      {subpath.url.pathname === `/token/${token.chainId}` &&
        <Menu>
          <NativeTokenMenu token={token} />
        </Menu>}
    </HashSubpathProvider>
    {chain.token.pairs?.map((address, i) =>
      <PriceResolver key={i}
        index={i}
        address={address}
        ok={onPrice} />)}
    <ClickableTokenRow
      href={menu.href}
      onClick={menu.onClick}
      onContextMenu={menu.onContextMenu}
      token={token}
      chain={chain}
      balanceQuery={balanceQuery}
      balanceUsdQuery={balanceUsdQuery} />
  </>
}

function ContractTokenMenu(props: { token: ContractTokenData }) {
  const close = useCloseContext().getOrThrow()
  const wallet = useWalletDataContext().getOrThrow()
  const path = usePathContext().getOrThrow()
  const { token } = props

  const send = useCoords(path, `/send?step=target&chain=${token.chainId}&token=${token.address}`)

  const settings = useTokenSettings(wallet, token)
  const favorite = settings.data?.get().enabled

  const onToggle = useAsyncUniqueCallback(() => Errors.runAndLogAndAlert(async () => {
    const enabled = !favorite

    await settings.mutate(s => {
      const data = Mutators.Datas.mapOrNew((d = {
        uuid: randomUUID(),
        token: TokenRef.from(token),
        wallet: WalletRef.from(wallet),
        enabled
      }): TokenSettingsData => {
        return { ...d, enabled }
      }, s.real?.data)

      return new Some(data)
    })

    close(true)
  }), [favorite, settings, token, wallet, close])

  return <div className="flex flex-col text-left gap-2">
    <WideShrinkableNakedMenuButton
      onClick={onToggle.run}>
      {favorite ? <Solid.StarIcon className="size-4" /> : <Outline.StarIcon className="size-4" />}
      {favorite ? "Unfavorite" : "Favorite"}
    </WideShrinkableNakedMenuButton>
    <WideShrinkableNakedMenuAnchor
      aria-disabled={wallet.type === "readonly"}
      onClick={send.onClick}
      onKeyDown={send.onKeyDown}
      href={send.href}>
      <Outline.PaperAirplaneIcon className="size-4" />
      Send
    </WideShrinkableNakedMenuAnchor>
    <WideShrinkableNakedMenuAnchor
      aria-disabled>
      <Outline.BanknotesIcon className="size-4" />
      Faucet
    </WideShrinkableNakedMenuAnchor>
  </div>
}

function MainnetContractTokenRow(props: { token: ContractTokenData } & { chain: ChainData }) {
  const path = usePathContext().getOrThrow()
  const wallet = useWalletDataContext().getOrThrow()
  const { token, chain } = props

  const subpath = useHashSubpath(path)
  const menu = useCoords(subpath, `/token/${token.uuid}`)

  const context = useEthereumContext(wallet.uuid, chain).getOrThrow()

  const [prices, setPrices] = useState(new Array<Nullable<Fixed.From>>(token.pairs?.length ?? 0))

  const balanceQuery = useContractBalance(wallet.address, token, "pending", context, prices)
  const balanceUsdQuery = useContractPricedBalance(wallet.address, token, "usd", context)

  const onPrice = useCallback(([index, data]: [number, Nullable<Fixed.From>]) => {
    setPrices(prices => {
      prices[index] = data
      return [...prices]
    })
  }, [])

  return <>
    <HashSubpathProvider>
      {subpath.url.pathname === `/token/${token.uuid}` &&
        <Menu>
          <ContractTokenMenu token={token} />
        </Menu>}
    </HashSubpathProvider>
    {token.pairs?.map((address, i) =>
      <PriceResolver key={i}
        index={i}
        address={address}
        ok={onPrice} />)}
    <ClickableTokenRow
      href={menu.href}
      onClick={menu.onClick}
      onContextMenu={menu.onContextMenu}
      token={token}
      chain={chain}
      balanceQuery={balanceQuery}
      balanceUsdQuery={balanceUsdQuery} />
  </>
}

function ContractTokenRow(props: { token: ContractTokenData } & { chain: ChainData }) {
  const path = usePathContext().getOrThrow()
  const wallet = useWalletDataContext().getOrThrow()
  const { token, chain } = props

  const subpath = useHashSubpath(path)
  const menu = useCoords(subpath, `/token/${token.uuid}`)

  const context = useEthereumContext(wallet.uuid, chain).getOrThrow()

  const [prices, setPrices] = useState(new Array<Nullable<Fixed.From>>(token.pairs?.length ?? 0))

  const balanceQuery = useContractBalance(wallet.address, token, "pending", context, prices)
  const balanceUsdQuery = useContractPricedBalance(wallet.address, token, "usd", context)

  const onPrice = useCallback(([index, data]: [number, Nullable<Fixed.From>]) => {
    setPrices(prices => {
      prices[index] = data
      return [...prices]
    })
  }, [])

  return <>
    <HashSubpathProvider>
      {subpath.url.pathname === `/token/${token.uuid}` &&
        <Menu>
          <ContractTokenMenu token={token} />
        </Menu>}
    </HashSubpathProvider>
    {token.pairs?.map((address, i) =>
      <PriceResolver key={i}
        index={i}
        address={address}
        ok={onPrice} />)}
    <ClickableTokenRow
      href={menu.href}
      onClick={menu.onClick}
      onContextMenu={menu.onContextMenu}
      token={token}
      chain={chain}
      balanceQuery={balanceQuery}
      balanceUsdQuery={balanceUsdQuery} />
  </>
}

export interface QueryLike<D, E> {
  readonly data?: Data<D>
  readonly error?: Fail<E>
  readonly current?: Fetched<D, E>
  readonly fetching?: boolean
}

export function PriceResolver(props: { index: number } & { address: string } & OkProps<[number, Nullable<Fixed.From>]>) {
  const { address } = props

  const pairData = pairByAddress[address]

  if (pairData.version === 2)
    return <PairV2PriceResolver {...props} />

  if (pairData.version === 3)
    return <PairV3PriceResolver {...props} />

  return null
}

export function PairV2PriceResolver(props: { index: number } & { address: string } & OkProps<[number, Nullable<Fixed.From>]>) {
  const { ok, index, address } = props
  const wallet = useWalletDataContext().getOrThrow()

  const pairData = pairByAddress[address]
  const chainData = chainDataByChainId[pairData.chainId]

  const context = useEthereumContext(wallet.uuid, chainData).getOrThrow()

  const { data } = usePairV2Price(context, pairData, "pending")

  console.log("pairv2", pairData, data)

  useEffect(() => {
    ok([index, data?.get()])
  }, [index, data, ok])

  return null
}

export function PairV3PriceResolver(props: { index: number } & { address: string } & OkProps<[number, Nullable<Fixed.From>]>) {
  const wallet = useWalletDataContext().getOrThrow()
  const { ok, index, address } = props

  const pairData = pairByAddress[address] as SimplePairDataV3
  const chainData = chainDataByChainId[pairData.chainId]

  const context = useEthereumContext(wallet.uuid, chainData).getOrThrow()

  const { data } = usePairV3Price(context, pairData, "pending")

  console.log("pairv3", pairData, data)

  useEffect(() => {
    ok([index, data?.get()])
  }, [index, data, ok])

  return null
}

function ClickableTokenRow(props: { token: TokenData } & { chain: ChainData } & { balanceQuery: QueryLike<Fixed.From, Error> } & { balanceUsdQuery: QueryLike<Fixed.From, Error> } & AnchorProps) {
  const { token, chain, balanceQuery, balanceUsdQuery, ...others } = props

  const tokenId = token.type === "native"
    ? token.chainId + token.symbol
    : token.chainId + token.address + token.symbol

  const modhash = useModhash(tokenId)
  const color = Color.get(modhash)

  const balanceDisplay = useDisplayRaw(balanceQuery.data?.get())
  const balanceUsdDisplay = useDisplayUsd(balanceUsdQuery.data?.get())

  return <a className="po-sm group flex items-center text-left"
    {...others}>
    <div className={`relative h-12 w-12 flex items-center justify-center bg-${color}-400 dark:bg-${color}-500 text-white rounded-full`}>
      <div className=""
        style={{ fontSize: `${Math.min((20 - (2 * token.symbol.length)), 16)}px` }}>
        {token.symbol}
      </div>
      <div className="absolute -bottom-2 -left-2">
        {chain.icon()}
      </div>
    </div>
    <div className="w-4" />
    <div className="grow">
      <div className="flex items-center">
        <div className="grow flex items-center gap-1">
          <span className="">
            {token.name}
          </span>
          <span className="text-contrast">
            on
          </span>
          <span className="">
            {chain.name}
          </span>
        </div>
        {balanceUsdDisplay != null &&
          <div className="flex items-center gap-1">
            <div>{balanceUsdDisplay}</div>
          </div>}
      </div>
      <div className="flex items-center text-contrast gap-1">
        <div>{balanceDisplay} {token.symbol}</div>
        {balanceQuery.error != null && <ExclamationTriangleIcon className="h-4 mt-0.5" />}
        {balanceQuery.fetching && <SmallUnflexLoading />}
      </div>
    </div>
  </a>
}