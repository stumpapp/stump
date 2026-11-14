import ReadiumShared

// these used to live in ReadiumInternal but were removed in 3.9.0, so to minimize the impact ive
// yoinked em here

/// filter falsy values from a dictionary
func makeJSON(_ dict: [String: Any?]) -> [String: Any] {
    dict.compactMapValues { $0 }
}

/// returns nil if the value is nil, otherwise returns it as Any
func encodeIfNotNil<T>(_ value: T?) -> Any? {
    value.map { $0 as Any }
}

/// returns nil if the dictionary is empty, otherwise returns it as [String: Any]
func encodeIfNotEmpty(_ dict: [String: JSONValue]) -> Any? {
    dict.isEmpty ? nil : dict.mapValues(\.any)
}

/// returns nil if the string is nil or empty, otherwise returns it as Any
func encodeIfNotEmpty(_ string: String?) -> Any? {
    guard let s = string, !s.isEmpty else { return nil }
    return s
}

extension Dictionary where Key == String, Value == JSONValue {
    /// returns the dictionary as [String: Any]
    var asAny: [String: Any] {
        mapValues(\.any)
    }
}
