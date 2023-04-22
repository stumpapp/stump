import {initializeApi, ping} from '@stump/api'
import {Stack, useRouter} from 'expo-router'
import {useEffect, useState} from 'react'
import {Text, TextInput, TouchableOpacity, View} from 'react-native'

import {ErrorSnack} from '../../components/SnackMessage'

export default function Connect() {
    const router = useRouter()
    // TODO: Remove this and use the connection url from the user
    const [connectionUrl, setConnectionUrl] = useState<string | undefined>('http://192.168.178.192:10821')
    const [error, setError] = useState<string | undefined>(undefined)

    useEffect(() => {
        console.log(error)
    }, [error])

    useEffect(() => {
        setError(undefined)
    }, [connectionUrl])

    const connect = async () => {
        initializeApi(connectionUrl, 'v1')
        try {
            const res = await ping()

            if (res.status !== 200) {
                setError('Could not connect to the server')
                return
            }
        } catch (e) {
            console.log(e)
        }

        router.push('/login')
    }

    return (
        <View className="flex flex-1 justify-center items-center px-5">
            <Stack.Screen options={{title: 'Connect to Stump'}}/>
            <TextInput
                className="border border-black w-full py-3 px-5"
                placeholder="http(s)://"
                placeholderTextColor={'#999'}
                value={connectionUrl}
                onChangeText={setConnectionUrl}
            />
            <TouchableOpacity className="bg-gray-900 rounded-lg p-3 px-6 mx-auto mt-10" onPress={connect}>
                <Text className="text-white">Connect</Text>
            </TouchableOpacity>

            {error && <ErrorSnack message={error}/>}
        </View>
    )
}
