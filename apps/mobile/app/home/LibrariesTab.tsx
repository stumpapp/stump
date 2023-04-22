import { API } from "@stump/api";
import { useLibraries } from "@stump/client";
import { Library } from "@stump/types";
import { Link } from "expo-router";
import { Image, Text, View } from "react-native";

export default function LibrariesTab() {
    const { libraries} = useLibraries()

    return (
        <View className="flex-1">
            <View className='flex flex-row flex-wrap'>
                {libraries && libraries.map((library) => <LibraryCard key={library.id} library={library} />)}
            </View>
        </View>
    );
}

const LibraryCard = ({library}: {library: Library}) => {
    const imageUrl = `${API.defaults.baseURL}/libraries/${library.id}/thumbnail`;
    return (
        <Link href={`/series/${library.id}`} className='m-2 h-80 w-52 bg-gray-200 rounded-md flex items-center'>
            <View className='m-2 h-80 w-52 bg-gray-200 rounded-md flex items-center'>
                <Image className='w-full h-72 rounded-t-md' source={{ uri: imageUrl }} />
                <Text className='py-2 font-medium text-md'>{library.name}</Text>
            </View>
        </Link>
    )
}