import {
  AppAction,
  IAppAction,
  IChannelMetadata,
  ISubtitleMetadata,
  IVideoMetadata,
} from '@joystream/metadata-protobuf'
import { DecodedMetadataObject } from '@joystream/metadata-protobuf/types'
import {
  DataObjectTypeChannelAvatar,
  DataObjectTypeChannelCoverPhoto,
  DataObjectTypeVideoMedia,
  DataObjectTypeVideoSubtitle,
  DataObjectTypeVideoThumbnail,
  Auction,
  AuctionTypeEnglish,
  AuctionTypeOpen,
  AuctionWhitelistedMember,
  Channel,
  NftOwnerChannel,
  NftOwnerMember,
  OwnedNft,
  TransactionalStatusAuction,
  TransactionalStatusBuyNow,
  TransactionalStatusIdle,
  TransactionalStatusInitiatedOfferToMember,
  Video,
  VideoSubtitle,
  ContentActor as ContentActorEntity,
  ContentActorMember,
  ContentActorCurator,
  ContentActorLead,
  Event,
  NftIssuedEventData,
  DataObjectType,
  Bid,
  NftOwner,
  Comment,
  CommentReaction,
  License as LicenseEntity,
  VideoMediaMetadata,
  VideoReaction,
  VideoMediaEncoding,
  App,
  BannedMember,
  Notification,
} from '../../model'
import { criticalError } from '../../utils/misc'
import { EntityManagerOverlay, Flat } from '../../utils/overlay'
import {
  ContentActor,
  EnglishAuctionParamsRecord,
  InitTransactionalStatusRecord,
  NftIssuanceParametersRecord,
  OpenAuctionParamsRecord,
  StorageAssetsRecord,
} from '../../types/v1000'
import { addNftActivity, addNftHistoryEntry, genericEventFields, invalidMetadata } from '../utils'
import { assertNotNull, SubstrateBlock } from '@subsquid/substrate-processor'
import { ed25519Verify } from '@polkadot/util-crypto'
import { integrateMeta } from '@joystream/metadata-protobuf/utils'
import { createType } from '@joystream/types'
import BN from 'bn.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AsDecoded<MetaClass> = MetaClass extends { create: (props?: infer I) => any }
  ? DecodedMetadataObject<I>
  : never

export type PropertyOfWithType<E, T> = {
  [K in keyof E]: [E[K]] extends [T | null | undefined] ? ([T] extends [E[K]] ? K : never) : never
}[keyof E] &
  string &
  keyof E

export type EntityAssetProps<E> = PropertyOfWithType<E, string | null>
export type MetaNumberProps<M> = PropertyOfWithType<M, number>

export type EntityAssetsMap<
  E,
  M,
  OTC extends { new (): DataObjectType } = { new (): DataObjectType }
> = {
  DataObjectTypeConstructor: OTC
  entityProperty: EntityAssetProps<E>
  metaProperty: MetaNumberProps<M>
  createDataObjectType: (e: Flat<E>) => InstanceType<OTC>
}[]

export type AssetsMap = {
  channel: EntityAssetsMap<
    Channel,
    IChannelMetadata,
    { new (): DataObjectType & { channel: string } }
  >
  video: EntityAssetsMap<Video, IVideoMetadata, { new (): DataObjectType & { video: string } }>
  subtitle: EntityAssetsMap<
    VideoSubtitle,
    ISubtitleMetadata,
    { new (): DataObjectType & { subtitle: string } }
  >
}

export const ASSETS_MAP: AssetsMap = {
  channel: [
    {
      DataObjectTypeConstructor: DataObjectTypeChannelAvatar,
      entityProperty: 'avatarPhotoId',
      metaProperty: 'avatarPhoto',
      createDataObjectType: (e) => new DataObjectTypeChannelAvatar({ channel: e.id }),
    },
    {
      DataObjectTypeConstructor: DataObjectTypeChannelCoverPhoto,
      entityProperty: 'coverPhotoId',
      metaProperty: 'coverPhoto',
      createDataObjectType: (e) => new DataObjectTypeChannelCoverPhoto({ channel: e.id }),
    },
  ],
  video: [
    {
      DataObjectTypeConstructor: DataObjectTypeVideoMedia,
      entityProperty: 'mediaId',
      metaProperty: 'video',
      createDataObjectType: (e) => new DataObjectTypeVideoMedia({ video: e.id }),
    },
    {
      DataObjectTypeConstructor: DataObjectTypeVideoThumbnail,
      entityProperty: 'thumbnailPhotoId',
      metaProperty: 'thumbnailPhoto',
      createDataObjectType: (e) => new DataObjectTypeVideoThumbnail({ video: e.id }),
    },
  ],
  subtitle: [
    {
      DataObjectTypeConstructor: DataObjectTypeVideoSubtitle,
      entityProperty: 'assetId',
      metaProperty: 'newAsset',
      createDataObjectType: (e) =>
        new DataObjectTypeVideoSubtitle({ video: assertNotNull(e.videoId), subtitle: e.id }),
    },
  ],
}

export async function deleteChannel(overlay: EntityManagerOverlay, channelId: bigint) {
  const bannedMembers = await overlay
    .getRepository(BannedMember)
    .getManyByRelation('channelId', channelId.toString())

  overlay.getRepository(BannedMember).remove(...bannedMembers)
  overlay.getRepository(Channel).remove(channelId.toString())
}

export async function deleteVideo(overlay: EntityManagerOverlay, videoId: bigint) {
  const videoRepository = overlay.getRepository(Video)
  const commentRepository = overlay.getRepository(Comment)
  const commentReactionRepository = overlay.getRepository(CommentReaction)
  const licenseRepository = overlay.getRepository(LicenseEntity)
  const videoReactionRepository = overlay.getRepository(VideoReaction)
  const mediaMetadataRepository = overlay.getRepository(VideoMediaMetadata)
  const mediaEncodingRepository = overlay.getRepository(VideoMediaEncoding)
  const subtitlesRepository = overlay.getRepository(VideoSubtitle)
  const notificationRepository = overlay.getRepository(Notification)
  const em = overlay.getEm()

  const video = await videoRepository.getByIdOrFail(videoId.toString())
  const comments = await commentRepository.getManyByRelation('videoId', video.id)
  const commentReactions = await commentReactionRepository.getManyByRelation('videoId', video.id)
  const videoReactions = await videoReactionRepository.getManyByRelation('videoId', video.id)
  const mediaMetadata = await mediaMetadataRepository.getOneByRelation('videoId', video.id)
  const mediaEncoding = await mediaEncodingRepository.getById(mediaMetadata?.encodingId || '')
  const subtitles = await subtitlesRepository.getManyByRelation('videoId', video.id)

  // Events to remove
  const eventsToRemove: Event[] = []
  const notificationsToRemove: Flat<Notification>[] = []
  if (comments.length) {
    // FIXME: We need to persist the state to get all CommentCreated/CommentTextUpdated events,
    // as the relationship is nested inside jsonb field, so we can't use any existing RepositoryOverlay methods.
    await overlay.updateDatabase()
    const relatedEvents = await em
      .getRepository(Event)
      .createQueryBuilder('e')
      .where(`e.data->>'comment' IN (${comments.map((c, i) => `:cid_${i}`).join(', ')})`)
      .setParameters(Object.fromEntries(comments.map((c, i) => [`cid_${i}`, c.id])))
      .getMany()
    eventsToRemove.push(...relatedEvents)
    const relatedNotifications = (
      await Promise.all(
        eventsToRemove.map((e) => notificationRepository.getManyByRelation('eventId', e.id))
      )
    ).flat()
    notificationsToRemove.push(...relatedNotifications)
  }

  commentReactionRepository.remove(...commentReactions)
  commentRepository.remove(...comments)
  if (video.licenseId) {
    licenseRepository.remove(video.licenseId)
  }
  videoReactionRepository.remove(...videoReactions)
  if (mediaMetadata?.id) {
    mediaMetadataRepository.remove(mediaMetadata.id)
  }
  if (mediaEncoding?.id) {
    mediaEncodingRepository.remove(mediaEncoding.id)
  }
  subtitlesRepository.remove(...subtitles)
  videoRepository.remove(video)
  notificationRepository.remove(...notificationsToRemove)
  overlay.getRepository(Event).remove(...eventsToRemove)
}

export async function processNft(
  overlay: EntityManagerOverlay,
  block: SubstrateBlock,
  indexInBlock: number,
  extrinsicHash: string | undefined,
  video: Flat<Video>,
  issuer: ContentActor,
  nftIssuanceParameters: NftIssuanceParametersRecord
): Promise<void> {
  const owner =
    nftIssuanceParameters.nonChannelOwner !== undefined
      ? new NftOwnerMember({ member: nftIssuanceParameters.nonChannelOwner.toString() })
      : new NftOwnerChannel({ channel: assertNotNull(video.channelId) })

  const creatorRoyalty =
    nftIssuanceParameters.royalty !== undefined
      ? // Royalty type is Perbill (1/10^9), so we divide by 10^7 to get Percent
        nftIssuanceParameters.royalty / Math.pow(10, 7)
      : undefined

  const nftRepository = overlay.getRepository(OwnedNft)
  const nft = nftRepository.new({
    id: video.id,
    videoId: video.id,
    creatorRoyalty,
    owner,
    createdAt: new Date(block.timestamp),
    isFeatured: false,
  })

  // update NFT transactional status
  processNftInitialTransactionalStatus(
    overlay,
    block,
    nft,
    nftIssuanceParameters.initTransactionalStatus
  )

  // Push a new NftIssued event
  const event = overlay.getRepository(Event).new({
    ...genericEventFields(overlay, block, indexInBlock, extrinsicHash),
    data: new NftIssuedEventData({
      actor: parseContentActor(issuer),
      nft: nft.id,
      nftOwner: nft.owner,
    }),
  })

  // Add nft history and activities entry
  const nftOwnerMemberId = await getNftOwnerMemberId(overlay, nft.owner)
  addNftHistoryEntry(overlay, nft.id, event.id)
  addNftActivity(overlay, [nftOwnerMemberId], event.id)
}

export function processNftInitialTransactionalStatus(
  overlay: EntityManagerOverlay,
  block: SubstrateBlock,
  nft: Flat<OwnedNft>,
  transactionalStatus: InitTransactionalStatusRecord
): void {
  switch (transactionalStatus.__kind) {
    case 'Idle': {
      nft.transactionalStatus = new TransactionalStatusIdle()
      return
    }
    case 'InitiatedOfferToMember': {
      const [memberId, price] = transactionalStatus.value
      nft.transactionalStatus = new TransactionalStatusInitiatedOfferToMember({
        member: memberId.toString(),
        price,
      })
      return
    }
    case 'OpenAuction':
    case 'EnglishAuction': {
      const auctionParams = transactionalStatus.value
      const auction = createAuction(overlay, block, nft, auctionParams)

      // create new auction
      nft.transactionalStatus = new TransactionalStatusAuction({
        auction: auction.id,
      })
      return
    }
    case 'BuyNow': {
      nft.transactionalStatus = new TransactionalStatusBuyNow({ price: transactionalStatus.value })
      return
    }
    default: {
      criticalError(`Unknown TransactionalStatus type`, { transactionalStatus })
    }
  }
}

export function createAuction(
  overlay: EntityManagerOverlay,
  block: SubstrateBlock,
  nft: Flat<OwnedNft>,
  auctionParams: OpenAuctionParamsRecord | EnglishAuctionParamsRecord
): Flat<Auction> {
  const startsAtBlock = auctionParams.startsAt ?? block.height
  const auctionRepository = overlay.getRepository(Auction)
  // prepare auction record
  const auction = auctionRepository.new({
    id: auctionRepository.getNewEntityId(),
    nftId: nft.id,
    startingPrice: auctionParams.startingPrice,
    buyNowPrice: auctionParams.buyNowPrice,
    auctionType: createAuctionType(block, auctionParams),
    startsAtBlock,
    isCanceled: false,
    isCompleted: false,
  })

  auctionParams.whitelist.forEach((m) =>
    overlay.getRepository(AuctionWhitelistedMember).new({
      id: `${m.toString()}-${auction.id}`,
      memberId: m.toString(),
      auctionId: auction.id,
    })
  )

  return auction
}

function createAuctionType(
  block: SubstrateBlock,
  auctionParams: OpenAuctionParamsRecord | EnglishAuctionParamsRecord
) {
  const startsAtBlock = auctionParams.startsAt ?? block.height

  // auction type `english`
  if ('duration' in auctionParams) {
    return new AuctionTypeEnglish({
      duration: auctionParams.duration,
      extensionPeriod: auctionParams.extensionPeriod,
      minimalBidStep: auctionParams.minBidStep,
      plannedEndAtBlock: startsAtBlock + auctionParams.duration,
    })
  }

  // auction type `open`
  return new AuctionTypeOpen({
    bidLockDuration: auctionParams.bidLockDuration,
  })
}

export function parseContentActor(contentActor: ContentActor): ContentActorEntity {
  if (contentActor.__kind === 'Member') {
    return new ContentActorMember({
      member: contentActor.value.toString(),
    })
  }

  if (contentActor.__kind === 'Curator') {
    const [, curatorId] = contentActor.value
    return new ContentActorCurator({
      curator: curatorId.toString(),
    })
  }

  if (contentActor.__kind === 'Lead') {
    return new ContentActorLead()
  }

  criticalError('Unknown ContentActor type', { contentActor })
}

export async function getCurrentAuctionFromVideo(
  overlay: EntityManagerOverlay,
  videoId: string
): Promise<Flat<Auction>> {
  const nft = await overlay.getRepository(OwnedNft).getByIdOrFail(videoId)
  if (nft.transactionalStatus?.isTypeOf !== 'TransactionalStatusAuction') {
    criticalError(`Nft of video ${videoId} was expected to be in TransactionalStatusAuction.`, {
      actualStatus: nft.transactionalStatus?.isTypeOf,
    })
  }
  return overlay.getRepository(Auction).getByIdOrFail(nft.transactionalStatus.auction)
}

export function findTopBid(bids: Flat<Bid>[]): Flat<Bid> | null {
  return bids.reduce((topBid, bid) => {
    if (bid.isCanceled) {
      return topBid
    }

    if (!topBid) {
      return bid
    }

    if (topBid.amount > bid.amount) {
      return topBid
    }

    if (topBid.amount < bid.amount) {
      return bid
    }
    // bids are equal, use the oldest one
    return topBid.createdInBlock < bid.createdInBlock ||
      (topBid.createdInBlock === bid.createdInBlock && topBid.indexInBlock < bid.indexInBlock)
      ? topBid
      : bid
  }, null as Flat<Bid> | null)
}

export async function createBid(
  overlay: EntityManagerOverlay,
  block: SubstrateBlock,
  indexInBlock: number,
  memberId: string,
  videoId: string,
  bidAmount?: bigint
): Promise<{
  bid: Flat<Bid>
  auctionBids: Flat<Bid>[]
  auction: Flat<Auction>
  previousTopBid?: Flat<Bid>
}> {
  const auction = await getCurrentAuctionFromVideo(overlay, videoId)
  const bidRepository = overlay.getRepository(Bid)
  const auctionBids = await bidRepository.getManyByRelation('auctionId', auction.id)

  // cancel any previous bids done by same member
  auctionBids
    .filter((b) => b.bidderId === memberId && !b.isCanceled)
    .forEach((b) => {
      b.isCanceled = true
    })

  const amount = bidAmount ?? (auction.buyNowPrice as bigint)
  const previousTopBidId = auction.topBidId

  // prepare bid record
  const newBid = bidRepository.new({
    id: bidRepository.getNewEntityId(),
    createdAt: new Date(block.timestamp),
    auctionId: auction.id,
    nftId: videoId,
    bidderId: memberId,
    amount,
    createdInBlock: block.height,
    isCanceled: false,
    indexInBlock,
  })
  auctionBids.push(newBid)

  // check if the auction's top bid needs to be updated, this can happen in those cases:
  // 1. auction doesn't have the top bid at the moment, new bid should be new top bid
  // 2. new bid is higher than the current top bid
  // 3. new bid canceled previous top bid (user changed their bid to a lower one), so we need to find a new one
  const previousTopBid = auctionBids.find((b) => b.id === previousTopBidId)
  if (!previousTopBid || newBid.amount > previousTopBid.amount) {
    // handle cases 1 and 2
    auction.topBidId = newBid.id
  } else {
    // handle case 3
    auction.topBidId = findTopBid(auctionBids)?.id || null
  }

  // Only set previous top bid if auction.topBid has been updated
  // and the action type is AuctionTypeEnglish
  if (
    auction.topBidId !== previousTopBidId &&
    auction.auctionType.isTypeOf === 'AuctionTypeEnglish'
  ) {
    newBid.previousTopBidId = previousTopBidId
    return { bid: newBid, auction, previousTopBid, auctionBids }
  }

  return { bid: newBid, auction, auctionBids }
}

export async function getChannelOwnerMemberByVideoId(
  overlay: EntityManagerOverlay,
  videoId: string
): Promise<string | undefined> {
  const video = await overlay.getRepository(Video).getByIdOrFail(videoId)
  if (video.channelId) {
    return getChannelOwnerMemberByChannelId(overlay, video.channelId)
  }
}

export async function getChannelOwnerMemberByChannelId(
  overlay: EntityManagerOverlay,
  channelId: string
): Promise<string | undefined> {
  const channel = await overlay.getRepository(Channel).getByIdOrFail(channelId)
  return channel.ownerMemberId ?? undefined
}

export async function getNftOwnerMemberId(
  overlay: EntityManagerOverlay,
  nftOwner: NftOwner
): Promise<string | undefined> {
  return nftOwner.isTypeOf === 'NftOwnerMember'
    ? nftOwner.member
    : getChannelOwnerMemberByChannelId(overlay, nftOwner.channel)
}

export async function finishAuction(
  overlay: EntityManagerOverlay,
  videoId: string,
  block: SubstrateBlock,
  openAuctionWinner?: { winnerId: bigint; bidAmount: bigint }
): Promise<{
  winningBid: Flat<Bid>
  auction: Flat<Auction>
  auctionBids: Flat<Bid>[]
  nft: Flat<OwnedNft>
  previousNftOwner: NftOwner
}> {
  function findOpenAuctionWinningBid(
    bids: Flat<Bid>[],
    bidAmount: bigint,
    winnerId: string,
    videoId: string
  ): Flat<Bid> {
    const winningBid = bids.find(
      (bid) => !bid.isCanceled && bid.bidderId === winnerId && bid.amount === bidAmount
    )

    if (!winningBid) {
      criticalError(`Open auction won by non-existing bid!`, {
        videoId,
        bidAmount,
        winnerId,
      })
    }

    return winningBid
  }

  // load video and auction
  const auction = await getCurrentAuctionFromVideo(overlay, videoId)
  const nft = await overlay.getRepository(OwnedNft).getByIdOrFail(videoId)
  const bidRepository = overlay.getRepository(Bid)
  const auctionBids = await bidRepository.getManyByRelation('auctionId', auction.id)

  const winningBid = openAuctionWinner
    ? findOpenAuctionWinningBid(
        auctionBids,
        openAuctionWinner.bidAmount,
        openAuctionWinner.winnerId.toString(),
        videoId
      )
    : assertNotNull(auctionBids.find((b) => b.id === auction.topBidId))

  // update NFT's transactional status
  nft.transactionalStatus = new TransactionalStatusIdle()
  // update NFT owner
  const previousNftOwner = nft.owner
  nft.owner = new NftOwnerMember({ member: assertNotNull(winningBid.bidderId) })

  // update auction
  auction.isCompleted = true
  auction.winningMemberId = winningBid.bidderId
  auction.endedAtBlock = block.height

  return { winningBid, nft, auction, previousNftOwner, auctionBids }
}

async function validateAndGetApp(
  overlay: EntityManagerOverlay,
  expectedSignedCommitment: string,
  appAction: DecodedMetadataObject<IAppAction>
): Promise<Flat<App> | undefined> {
  // If one is missing we cannot verify the signature
  if (!appAction.appId || !appAction.signature) {
    invalidMetadata(AppAction, 'Missing action fields to verify app', { decodedMessage: appAction })
    return undefined
  }

  const app = await overlay.getRepository(App).getById(appAction.appId)

  if (!app) {
    invalidMetadata(AppAction, 'No app of given id found', { decodedMessage: appAction })
    return undefined
  }

  if (!app.authKey) {
    invalidMetadata(AppAction, 'The provided app has no auth key assigned', {
      decodedMessage: appAction,
      app,
    })
    return undefined
  }

  try {
    const isSignatureValid = ed25519Verify(
      expectedSignedCommitment,
      appAction.signature,
      app.authKey
    )

    if (!isSignatureValid) {
      invalidMetadata(AppAction, 'Invalid app action signature', { decodedMessage: appAction })
    }

    return isSignatureValid ? app : undefined
  } catch (e) {
    invalidMetadata(AppAction, `Could not verify signature: ${(e as Error)?.message}`, {
      decodedMessage: appAction,
    })
    return undefined
  }
}

export async function processAppActionMetadata<
  T extends { entryAppId?: string | null | undefined }
>(
  overlay: EntityManagerOverlay,
  entity: T,
  meta: DecodedMetadataObject<IAppAction>,
  expectedSignedCommitment: string,
  entityMetadataProcessor: (entity: T) => Promise<void>
): Promise<void> {
  const app = await validateAndGetApp(overlay, expectedSignedCommitment, meta)
  if (!app) {
    return entityMetadataProcessor(entity)
  }

  integrateMeta(entity, { entryAppId: app.id }, ['entryAppId'])

  return entityMetadataProcessor(entity)
}

export function encodeAssets(assets: StorageAssetsRecord | undefined): Uint8Array {
  return createType(
    'Option<PalletContentStorageAssetsRecord>',
    assets
      ? {
          expectedDataSizeFee: new BN(assets.expectedDataSizeFee.toString()),
          objectCreationList: assets.objectCreationList.map((o) => ({
            size_: new BN(o.size.toString()),
            ipfsContentId: Array.from(o.ipfsContentId),
          })),
        }
      : null
  ).toU8a()
}
