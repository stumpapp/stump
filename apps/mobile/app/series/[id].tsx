import {API} from "@stump/api";
import {useLibrarySeries} from "@stump/client";
import {Series} from "@stump/types";
import {Link, useSearchParams} from "expo-router";
import { Image, SafeAreaView, Text, View } from "react-native";

export default function Library() {
    const { id } = useSearchParams();

    const { series } = useLibrarySeries(id as string);

    return (
        <SafeAreaView className="flex-1 mx-5 mt-10">
            <Text className='font-semibold text-2xl'>Series</Text>
            <View className="flex flex-row flex-wrap mt-5">
                {series && series.map((series) => <SeriesCard key={series.id} series={series}/>)}
            </View>
        </SafeAreaView>
    );
}

const SeriesCard = ({series}: {series: Series}) => {
    const imageUrl = `${API.defaults.baseURL}/series/${series.id}/thumbnail`;
    return (
        <Link href={`/books/${series.id}`} className='m-2 h-80 w-52 bg-gray-200 rounded-md flex items-center'>
            <View className='m-2 h-80 w-52 bg-gray-200 rounded-md flex items-center'>
                <Image className='w-full h-72 rounded-t-md' source={{ uri: imageUrl }} />
                <Text className='py-2 font-medium text-md'>{series.name}</Text>
            </View>
        </Link>
    )
}