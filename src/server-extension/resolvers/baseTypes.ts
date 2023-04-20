import { Field, Int, ObjectType, registerEnumType } from 'type-graphql'

import { GraphQLScalarType } from 'graphql'

// We only need to define one field for each type, which matches with the autogenerated type's field

@ObjectType()
export class Channel {
  @Field(() => String, { nullable: false }) id!: string
}

@ObjectType()
export class OwnedNft {
  @Field(() => String, { nullable: false }) id!: string
}

export const ChannelWhereInput = new GraphQLScalarType({
  name: 'ChannelWhereInput',
})

export enum ChannelOrderByInput {
  id_ASC,
}
registerEnumType(ChannelOrderByInput, { name: 'ChannelOrderByInput' })

@ObjectType()
export class Video {
  @Field(() => String, { nullable: false }) id!: string
}

export const VideoWhereInput = new GraphQLScalarType({
  name: 'VideoWhereInput',
})

@ObjectType()
export class VideoCategory {
  @Field(() => String, { nullable: false }) id!: string
}

@ObjectType()
export class VideoHero {
  @Field(() => String, { nullable: false }) id!: string
}

@ObjectType()
export class Membership {
  @Field(() => String, { nullable: false }) id!: string
}

export enum VideoOrderByInput {
  id_ASC,
}
registerEnumType(VideoOrderByInput, { name: 'VideoOrderByInput' })

@ObjectType()
export class VideosConnection {
  @Field(() => Int, { nullable: false }) totalCount!: number
}
export const OwnedNftWhereInput = new GraphQLScalarType({
  name: 'OwnedNftWhereInput',
})
