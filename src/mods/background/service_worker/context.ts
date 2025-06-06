import { ChainData } from "@/libs/ethereum/mods/chain"
import { Maps } from "@/libs/maps/maps"
import { ping } from "@/libs/ping"
import { TorRpc } from "@/libs/rpc/rpc"
import { AbortSignals } from "@/libs/signals"
import { Fail, Fetched } from "@hazae41/glacier"
import { Option } from "@hazae41/option"
import { Catched } from "@hazae41/result"
import { EthBrume } from "./entities/brumes/data"
import { EthereumChainlessRpcRequestPreinit } from "./entities/wallets/data"

export class BgEthereumContext<Id extends number = number> {

  constructor(
    readonly uuid: string,
    readonly chain: ChainData<Id>,
    readonly brume: EthBrume
  ) { }

  switch<Id extends number = number>(chain: ChainData<Id>) {
    return new BgEthereumContext<Id>(this.uuid, chain, this.brume)
  }

  async fetchOrThrow<T>(info: EthereumChainlessRpcRequestPreinit<unknown>, init: RequestInit = {}) {
    try {
      const presignal = AbortSignals.getOrNever(init.signal)

      const circuits = Option.wrap(this.brume.ethereum[this.chain.chainId]).getOrThrow()
      const circuit = await circuits.get().getCryptoRandomOrThrow(presignal)

      const runWithTargetOrThrow = async (index: number) => {
        const target = await circuit.get().getOrThrow(index, presignal)

        const { counter, connection } = target
        const request = counter.prepare(info)

        if (connection.isURL()) {
          const { url, circuit } = connection

          const signal = AbortSignal.any([AbortSignal.timeout(ping.value * 9), presignal])
          const response = await TorRpc.fetchWithCircuitOrThrow<T>(url, { ...request, circuit, signal })

          if (response.isOk())
            console.debug(`Fetched ${request.method} on ${this.chain.name}`, response)

          if (response.isErr())
            console.debug(`Failed to fetch ${request.method} on ${this.chain.name}`, response)

          return Fetched.rewrap(response)
        }

        if (connection.isWebSocket()) {
          const { socket, cooldown } = connection

          await cooldown

          const signal = AbortSignal.any([AbortSignal.timeout(ping.value * 9), presignal])
          const response = await TorRpc.fetchWithSocketOrThrow<T>(socket, request, signal)

          if (response.isOk())
            console.debug(`Fetched ${request.method} on ${this.chain.name}`, response)

          if (response.isErr())
            console.debug(`Failed to fetch ${request.method} on ${this.chain.name}`, response)

          return Fetched.rewrap(response)
        }

        return connection satisfies never
      }

      const promises = Array.from({ length: circuit.get().size }, (_, i) => runWithTargetOrThrow(i))

      const results = await Promise.allSettled(promises)

      const fetcheds = new Map<string, Fetched<T, Error>>()
      const counters = new Map<string, number>()

      for (const result of results) {
        if (result.status === "rejected")
          continue
        if (result.value.isErr())
          continue
        if (info?.noCheck)
          return result.value
        const raw = JSON.stringify(result.value.inner)
        const previous = Option.wrap(counters.get(raw)).getOr(0)
        counters.set(raw, previous + 1)
        fetcheds.set(raw, result.value)
      }

      /**
       * One truth -> return it
       * Zero truth -> throw AggregateError
       */
      if (counters.size < 2)
        return await Promise.any(promises)

      console.warn(`Different results from multiple connections for ${info.method} on ${this.chain.name}`, { fetcheds })

      /**
       * Sort truths by occurence
       */
      const sorteds = [...Maps.entries(counters)].sort((a, b) => b.value - a.value)

      /**
       * Two concurrent truths
       */
      if (sorteds[0].value === sorteds[1].value) {
        console.warn(`Could not choose truth for ${info.method} on ${this.chain.name}`)
        const random = Math.round(Math.random())
        return fetcheds.get(sorteds[random].key)!
      }

      return fetcheds.get(sorteds[0].key)!
    } catch (e: unknown) {
      return new Fail(Catched.wrap(e))
    }
  }

}