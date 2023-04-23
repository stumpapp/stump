// #[macro_export]
// macro_rules! prisma_joiner {
//     ($name:expr) => {
//         macro_rules! joiner {
//             ($($x:expr),+ $(,)?) => {
//                 $crate::operator::$name(vec![$($x),+])
//             };
//         }
//     };
// }
// #[macro_export]
// macro_rules! prisma_joiner {
//     ($name:ident) => {
//         macro_rules! $name {
//             ($($x:expr),* $(,)?) => {
//                 $crate::operator::$name(vec![$($x),*])
//             };
//         }
//     };
// }
