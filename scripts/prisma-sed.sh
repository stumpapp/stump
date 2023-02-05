# TODO: make more dyanimc of a script
set -ex; \
    sed -i 's|\/.*\/core\/prisma\/schema.prisma|\/app\/core\/prisma\/schema.prisma|g' core/src/prisma.rs; \
    sed -i 's|\/.*\/core\/prisma\/migrations|\/app\/core\/prisma\/migrations|g' core/src/prisma.rs