import { Color } from "@/libs/colors/colors"
import { useCopy } from "@/libs/copy/copy"
import { chainDataByChainId } from "@/libs/ethereum/mods/chain"
import { useCompactDisplayUsd } from "@/libs/fixed"
import { Outline } from "@/libs/icons"
import { Events, useMouseCancel } from "@/libs/react/events"
import { ChildrenProps } from "@/libs/react/props/children"
import { AnchorProps, ButtonProps } from "@/libs/react/props/html"
import { GapperAndClickerInButtonDiv } from "@/libs/ui/shrinker"
import { getWalletEmoji, WalletData } from "@/mods/background/service_worker/entities/wallets/data"
import { useWalletTotalPricedBalance } from "@/mods/universal/ethereum/mods/tokens/mods/balance/hooks"
import { useCoords, useHashSubpath, usePathContext } from "@hazae41/chemin"
import { Address, ZeroHexString } from "@hazae41/cubane"
import { useCallback, useEffect, useMemo, useState } from "react"
import { flushSync } from "react-dom"
import { useLocaleContext } from "../../global/mods/locale"
import { Locale } from "../../locale"
import { useEnsReverseNoFetch } from "../names/data"
import { useWalletDataContext } from "./context"
import { useEthereumContext } from "./data"

export function RawWalletDataCard(props: { index?: number } & { href?: string } & { privateKey?: string } & { flip?: boolean } & { unflip?: () => void }) {
  const wallet = useWalletDataContext().getOrThrow()
  const { index, href, privateKey, flip, unflip } = props

  return <RawWalletCard
    type={wallet.type}
    uuid={wallet.uuid}
    address={wallet.address}
    name={wallet.name}
    color={Color.get(wallet.color)}
    privateKey={privateKey}
    flip={flip}
    unflip={unflip}
    index={index}
    href={href} />
}

export function RawWalletCard(props: { type?: WalletData["type"] } & { uuid: string } & { name: string } & { color: Color } & { address: ZeroHexString } & { index?: number } & { href?: string } & { privateKey?: string } & { flip?: boolean } & { unflip?: () => void }) {
  const path = usePathContext().getOrThrow()
  const locale = useLocaleContext().getOrThrow()
  const { type, uuid, address, name, color, index, href, privateKey, flip, unflip } = props

  const hash = useHashSubpath(path)
  const coords = useCoords(hash, href)

  const finalAddress = useMemo(() => {
    return Address.fromOrThrow(address)
  }, [address])

  const addressDisplay = useMemo(() => {
    return Address.format(finalAddress)
  }, [finalAddress])

  const mainnet = useEthereumContext(uuid, chainDataByChainId[1]).getOrThrow()
  const ens = useEnsReverseNoFetch(finalAddress, mainnet)

  const ensOrFinalAddress = ens.data?.get() ?? finalAddress
  const ensOrAddressDisplay = ens.data?.get() ?? addressDisplay

  const copyEthereumAddress = useCopy(ensOrFinalAddress)
  const onClickCopyEthereumAddress = useMouseCancel(copyEthereumAddress.run)

  const totalBalanceQuery = useWalletTotalPricedBalance(finalAddress)
  const totalBalanceDisplay = useCompactDisplayUsd(totalBalanceQuery.data?.get(), locale)

  const [preflip = false, setPreflip] = useState(flip)
  const [postflip, setPostflip] = useState(false)

  const onAnimationEnd = useCallback(() => {
    flushSync(() => setPostflip(preflip))
  }, [preflip])

  useEffect(() => {
    setPreflip(flip)
  }, [flip])

  useEffect(() => {
    if (preflip)
      return
    if (postflip)
      return
    unflip?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preflip, postflip])

  const First =
    <div className="flex items-center">
      <div className="flex-none text-xl">
        {type && getWalletEmoji(type)}
      </div>
      <div className="w-2 grow" />
      {index == null && href != null &&
        <CircularWhiteAnchorInColoredCard
          onKeyDown={coords.onKeyDown}
          onClick={coords.onClick}
          href={coords.href}
          color={color}>
          <Outline.EllipsisHorizontalIcon className="size-4" />
        </CircularWhiteAnchorInColoredCard>}
      {index != null && index !== -1 &&
        <div className={`border-2 border-white flex items-center justify-center rounded-full overflow-hidden`}>
          <div className={`bg-blue-600 flex items-center justify-center size-5 text-white font-medium`}>
            {index + 1}
          </div>
        </div>}
      {index != null && index === -1 &&
        <div className={`border-2 border-default-contrast flex items-center justify-center rounded-full`}>
          <div className="size-5" />
        </div>}
    </div>

  const Name =
    <div className="flex items-center text-white font-medium">
      <div className="truncate">
        {name}
      </div>
      <div className="w-2 grow" />
      <div className="font-base text-white-half-contrast">
        {totalBalanceDisplay}
      </div>
    </div>

  const AddressDisplay =
    <div className="flex justify-between items-center text-sm">
      <div className="text-white-half-contrast">
        ETH
      </div>
      <div className="cursor-pointer text-white-half-contrast"
        onClick={onClickCopyEthereumAddress}>
        {copyEthereumAddress.current
          ? Locale.get(Locale.Copied, locale)
          : ensOrAddressDisplay}
      </div>
    </div>

  return <div className="w-full h-full [perspective:1000px]">
    <div className={`relative z-10 w-full h-full text-white bg-${color}-400 dark:bg-${color}-500 rounded-xl ${preflip && !postflip ? "animate-flip-in" : ""} ${!preflip && postflip ? "animate-flip-out" : ""}`}
      style={{ transform: preflip && postflip ? `rotateY(180deg)` : "", transformStyle: "preserve-3d" }}
      onAnimationEnd={onAnimationEnd}>
      <div className="po-2 absolute w-full h-full flex flex-col [backface-visibility:hidden]"
        onContextMenu={coords.onContextMenu}>
        {First}
        <div className="grow" />
        {Name}
        {AddressDisplay}
      </div>
      <div className="po-2 absolute w-full h-full flex flex-col [backface-visibility:hidden] [transform:rotateY(180deg)]"
        onContextMenu={coords.onContextMenu}>
        <div className="flex items-center">
          <div className="w-2 grow" />
          <CircularWhiteButtonInColoredCard
            onClick={() => setPreflip?.(false)}
            color={color}>
            <Outline.ArrowLeftIcon className="size-4" />
          </CircularWhiteButtonInColoredCard>
        </div>
        <div className="grow" />
        <div className="text-white">
          {Locale.get(Locale.PrivateKey, locale)}
        </div>
        <div className="text-white-half-contrast break-all"
          onContextMenu={Events.keep}>
          {privateKey}
        </div>
      </div>
    </div>
  </div>
}

export function CircularWhiteAnchorInColoredCard(props: AnchorProps & ChildrenProps & { color: Color }) {
  const { children, color, "aria-disabled": disabled = false, ...rest } = props

  return <a className={`group p-1 bg-white text-${color}-400 dark:text-${color}-500 rounded-full outline-none aria-[disabled=false]:hover:bg-white/90 focus-visible:outline-white aria-disabled:opacity-50 transition-opacity`}
    aria-disabled={disabled}
    {...rest}>
    <div className="h-full w-full flex items-center justify-center gap-2 group-aria-[disabled=false]:group-active:scale-90 transition-transform">
      {children}
    </div>
  </a>
}

export function CircularWhiteButtonInColoredCard(props: ButtonProps & ChildrenProps & { color: Color }) {
  const { children, color, ...rest } = props

  return <button className={`group p-1 bg-white text-${color}-400 dark:text-${color}-500 rounded-full outline-none enabled:hover:bg-white/90 focus-visible:outline-white disabled:opacity-50 transition-opacity`}
    {...rest}>
    <GapperAndClickerInButtonDiv>
      {children}
    </GapperAndClickerInButtonDiv>
  </button>
}