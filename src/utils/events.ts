import { SubstrateBlock } from '@subsquid/substrate-processor'
import {
  ContentVideoCreatedEvent,
  ContentVideoUpdatedEvent,
  ContentVideoDeletedEvent,
  ContentVideoDeletedByModeratorEvent,
  ContentVideoVisibilitySetByModeratorEvent,
  ContentChannelCreatedEvent,
  ContentChannelUpdatedEvent,
  ContentChannelDeletedEvent,
  ContentChannelDeletedByModeratorEvent,
  ContentChannelVisibilitySetByModeratorEvent,
  ContentChannelOwnerRemarkedEvent,
  ContentChannelAgentRemarkedEvent,
  ContentOpenAuctionStartedEvent,
  ContentEnglishAuctionStartedEvent,
  ContentNftIssuedEvent,
  ContentAuctionBidMadeEvent,
  ContentAuctionBidCanceledEvent,
  ContentAuctionCanceledEvent,
  ContentEnglishAuctionSettledEvent,
  ContentBidMadeCompletingAuctionEvent,
  ContentOpenAuctionBidAcceptedEvent,
  ContentOfferStartedEvent,
  ContentOfferAcceptedEvent,
  ContentOfferCanceledEvent,
  ContentNftSellOrderMadeEvent,
  ContentNftBoughtEvent,
  ContentBuyNowCanceledEvent,
  ContentBuyNowPriceUpdatedEvent,
  ContentNftSlingedBackToTheOriginalArtistEvent,
  ContentChannelPayoutsUpdatedEvent,
  ContentChannelRewardUpdatedEvent,
  ContentChannelFundsWithdrawnEvent,
  ContentChannelRewardClaimedAndWithdrawnEvent,
  StorageStorageBucketCreatedEvent,
  StorageDynamicBagCreatedEvent,
  StorageDataObjectsUploadedEvent,
  MembersMemberCreatedEvent,
  MembersMembershipBoughtEvent,
  MembersMembershipGiftedEvent,
  MembersMemberInvitedEvent,
  MembersMemberAccountsUpdatedEvent,
  MembersMemberProfileUpdatedEvent,
  MembersMemberRemarkedEvent,
  StorageStorageBucketInvitationAcceptedEvent,
  StorageStorageBucketsUpdatedForBagEvent,
  StorageStorageOperatorMetadataSetEvent,
  StorageStorageBucketVoucherLimitsSetEvent,
  StoragePendingDataObjectsAcceptedEvent,
  StorageStorageBucketOperatorInvitedEvent,
  StorageStorageBucketOperatorRemovedEvent,
  StorageStorageBucketStatusUpdatedEvent,
  StorageStorageBucketDeletedEvent,
  StorageVoucherChangedEvent,
  StorageDynamicBagDeletedEvent,
  StorageDataObjectsUpdatedEvent,
  StorageDataObjectsMovedEvent,
  StorageDataObjectsDeletedEvent,
  StorageDistributionBucketCreatedEvent,
  StorageDistributionBucketStatusUpdatedEvent,
  StorageDistributionBucketDeletedEvent,
  StorageDistributionBucketsUpdatedForBagEvent,
  StorageDistributionBucketModeUpdatedEvent,
  StorageDistributionBucketOperatorInvitedEvent,
  StorageDistributionBucketInvitationCancelledEvent,
  StorageDistributionBucketInvitationAcceptedEvent,
  StorageDistributionBucketMetadataSetEvent,
  StorageDistributionBucketOperatorRemovedEvent,
  StorageDistributionBucketFamilyCreatedEvent,
  StorageDistributionBucketFamilyMetadataSetEvent,
  StorageDistributionBucketFamilyDeletedEvent,
  StorageStorageBucketInvitationCancelledEvent,
} from '../types/events'
import { EntityManagerOverlay } from './overlay'

export const eventConstructors = {
  'Content.VideoCreated': ContentVideoCreatedEvent,
  'Content.VideoUpdated': ContentVideoUpdatedEvent,
  'Content.VideoDeleted': ContentVideoDeletedEvent,
  'Content.VideoDeletedByModerator': ContentVideoDeletedByModeratorEvent,
  'Content.VideoVisibilitySetByModerator': ContentVideoVisibilitySetByModeratorEvent,
  'Content.ChannelCreated': ContentChannelCreatedEvent,
  'Content.ChannelUpdated': ContentChannelUpdatedEvent,
  'Content.ChannelDeleted': ContentChannelDeletedEvent,
  'Content.ChannelDeletedByModerator': ContentChannelDeletedByModeratorEvent,
  'Content.ChannelVisibilitySetByModerator': ContentChannelVisibilitySetByModeratorEvent,
  'Content.ChannelOwnerRemarked': ContentChannelOwnerRemarkedEvent,
  'Content.ChannelAgentRemarked': ContentChannelAgentRemarkedEvent,
  'Content.OpenAuctionStarted': ContentOpenAuctionStartedEvent,
  'Content.EnglishAuctionStarted': ContentEnglishAuctionStartedEvent,
  'Content.NftIssued': ContentNftIssuedEvent,
  'Content.AuctionBidMade': ContentAuctionBidMadeEvent,
  'Content.AuctionBidCanceled': ContentAuctionBidCanceledEvent,
  'Content.AuctionCanceled': ContentAuctionCanceledEvent,
  'Content.EnglishAuctionSettled': ContentEnglishAuctionSettledEvent,
  'Content.BidMadeCompletingAuction': ContentBidMadeCompletingAuctionEvent,
  'Content.OpenAuctionBidAccepted': ContentOpenAuctionBidAcceptedEvent,
  'Content.OfferStarted': ContentOfferStartedEvent,
  'Content.OfferAccepted': ContentOfferAcceptedEvent,
  'Content.OfferCanceled': ContentOfferCanceledEvent,
  'Content.NftSellOrderMade': ContentNftSellOrderMadeEvent,
  'Content.NftBought': ContentNftBoughtEvent,
  'Content.BuyNowCanceled': ContentBuyNowCanceledEvent,
  'Content.BuyNowPriceUpdated': ContentBuyNowPriceUpdatedEvent,
  'Content.NftSlingedBackToTheOriginalArtist': ContentNftSlingedBackToTheOriginalArtistEvent,
  'Content.ChannelPayoutsUpdated': ContentChannelPayoutsUpdatedEvent,
  'Content.ChannelRewardUpdated': ContentChannelRewardUpdatedEvent,
  'Content.ChannelFundsWithdrawn': ContentChannelFundsWithdrawnEvent,
  'Content.ChannelRewardClaimedAndWithdrawn': ContentChannelRewardClaimedAndWithdrawnEvent,
  'Storage.StorageBucketCreated': StorageStorageBucketCreatedEvent,
  'Storage.StorageBucketInvitationAccepted': StorageStorageBucketInvitationAcceptedEvent,
  'Storage.StorageBucketsUpdatedForBag': StorageStorageBucketsUpdatedForBagEvent,
  'Storage.StorageOperatorMetadataSet': StorageStorageOperatorMetadataSetEvent,
  'Storage.StorageBucketVoucherLimitsSet': StorageStorageBucketVoucherLimitsSetEvent,
  'Storage.PendingDataObjectsAccepted': StoragePendingDataObjectsAcceptedEvent,
  'Storage.StorageBucketInvitationCancelled': StorageStorageBucketInvitationCancelledEvent,
  'Storage.StorageBucketOperatorInvited': StorageStorageBucketOperatorInvitedEvent,
  'Storage.StorageBucketOperatorRemoved': StorageStorageBucketOperatorRemovedEvent,
  'Storage.StorageBucketStatusUpdated': StorageStorageBucketStatusUpdatedEvent,
  'Storage.StorageBucketDeleted': StorageStorageBucketDeletedEvent,
  'Storage.VoucherChanged': StorageVoucherChangedEvent,
  'Storage.DynamicBagCreated': StorageDynamicBagCreatedEvent,
  'Storage.DynamicBagDeleted': StorageDynamicBagDeletedEvent,
  'Storage.DataObjectsUploaded': StorageDataObjectsUploadedEvent,
  'Storage.DataObjectsUpdated': StorageDataObjectsUpdatedEvent,
  'Storage.DataObjectsMoved': StorageDataObjectsMovedEvent,
  'Storage.DataObjectsDeleted': StorageDataObjectsDeletedEvent,
  'Storage.DistributionBucketCreated': StorageDistributionBucketCreatedEvent,
  'Storage.DistributionBucketStatusUpdated': StorageDistributionBucketStatusUpdatedEvent,
  'Storage.DistributionBucketDeleted': StorageDistributionBucketDeletedEvent,
  'Storage.DistributionBucketsUpdatedForBag': StorageDistributionBucketsUpdatedForBagEvent,
  'Storage.DistributionBucketModeUpdated': StorageDistributionBucketModeUpdatedEvent,
  'Storage.DistributionBucketOperatorInvited': StorageDistributionBucketOperatorInvitedEvent,
  'Storage.DistributionBucketInvitationCancelled':
    StorageDistributionBucketInvitationCancelledEvent,
  'Storage.DistributionBucketInvitationAccepted': StorageDistributionBucketInvitationAcceptedEvent,
  'Storage.DistributionBucketMetadataSet': StorageDistributionBucketMetadataSetEvent,
  'Storage.DistributionBucketOperatorRemoved': StorageDistributionBucketOperatorRemovedEvent,
  'Storage.DistributionBucketFamilyCreated': StorageDistributionBucketFamilyCreatedEvent,
  'Storage.DistributionBucketFamilyMetadataSet': StorageDistributionBucketFamilyMetadataSetEvent,
  'Storage.DistributionBucketFamilyDeleted': StorageDistributionBucketFamilyDeletedEvent,
  'Members.MemberCreated': MembersMemberCreatedEvent,
  'Members.MembershipBought': MembersMembershipBoughtEvent,
  'Members.MembershipGifted': MembersMembershipGiftedEvent,
  'Members.MemberInvited': MembersMemberInvitedEvent,
  'Members.MemberAccountsUpdated': MembersMemberAccountsUpdatedEvent,
  'Members.MemberProfileUpdated': MembersMemberProfileUpdatedEvent,
  'Members.MemberRemarked': MembersMemberRemarkedEvent,
} as const

export type EventNames = keyof typeof eventConstructors
export type EventConstructor<EventName extends EventNames> = typeof eventConstructors[EventName]
export type EventInstance<EventName extends EventNames> = InstanceType<EventConstructor<EventName>>

export type EventHandlerContext<EventName extends EventNames> = {
  overlay: EntityManagerOverlay
  block: SubstrateBlock
  indexInBlock: number
  extrinsicHash?: string
  event: EventInstance<EventName>
}

export type EventHandler<EventName extends EventNames> =
  | ((ctx: EventHandlerContext<EventName>) => void)
  | ((ctx: EventHandlerContext<EventName>) => Promise<void>)
