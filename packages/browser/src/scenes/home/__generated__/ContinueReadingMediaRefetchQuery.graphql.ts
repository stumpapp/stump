/**
 * @generated SignedSource<<00e23cc7a5c7e5c4520a0cb7c731d5f6>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type Pagination = {
  cursor?: CursorPagination | null | undefined;
  none?: Unpaginated | null | undefined;
  offset?: OffsetPagination | null | undefined;
};
export type CursorPagination = {
  after?: string | null | undefined;
  limit: number;
};
export type OffsetPagination = {
  page: number;
  pageSize?: number | null | undefined;
  zeroBased?: boolean | null | undefined;
};
export type Unpaginated = {
  unpaginated: boolean;
};
export type ContinueReadingMediaRefetchQuery$variables = {
  pagination?: Pagination | null | undefined;
};
export type ContinueReadingMediaRefetchQuery$data = {
  readonly " $fragmentSpreads": FragmentRefs<"ContinueReadingMediaFragment">;
};
export type ContinueReadingMediaRefetchQuery = {
  response: ContinueReadingMediaRefetchQuery$data;
  variables: ContinueReadingMediaRefetchQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": {
      "offset": {
        "page": 1
      }
    },
    "kind": "LocalArgument",
    "name": "pagination"
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "pagination",
    "variableName": "pagination"
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "ContinueReadingMediaRefetchQuery",
    "selections": [
      {
        "args": (v1/*: any*/),
        "kind": "FragmentSpread",
        "name": "ContinueReadingMediaFragment"
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "ContinueReadingMediaRefetchQuery",
    "selections": [
      {
        "alias": null,
        "args": (v1/*: any*/),
        "concreteType": "PaginatedMediaResponse",
        "kind": "LinkedField",
        "name": "keepReading",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "Media",
            "kind": "LinkedField",
            "name": "nodes",
            "plural": true,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "id",
                "storageKey": null
              }
            ],
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": null,
            "kind": "LinkedField",
            "name": "pageInfo",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "__typename",
                "storageKey": null
              },
              {
                "kind": "InlineFragment",
                "selections": [
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "totalPages",
                    "storageKey": null
                  }
                ],
                "type": "OffsetPaginationInfo",
                "abstractKey": null
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "8e14ac2c5bf82b4c7cbe882ee1d925d1",
    "id": null,
    "metadata": {},
    "name": "ContinueReadingMediaRefetchQuery",
    "operationKind": "query",
    "text": "query ContinueReadingMediaRefetchQuery(\n  $pagination: Pagination = {offset: {page: 1}}\n) {\n  ...ContinueReadingMediaFragment_5qyiy\n}\n\nfragment ContinueReadingMediaFragment_5qyiy on Query {\n  keepReading(pagination: $pagination) {\n    nodes {\n      id\n    }\n    pageInfo {\n      __typename\n      ... on OffsetPaginationInfo {\n        totalPages\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "5e694e32bb6f4639c91f8880a555d92e";

export default node;
