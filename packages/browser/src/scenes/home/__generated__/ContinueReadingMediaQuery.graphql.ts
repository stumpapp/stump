/**
 * @generated SignedSource<<e16891bbef8cf4b4cf1fb43a2082413d>>
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
  limit?: number;
};
export type OffsetPagination = {
  page: number;
  pageSize?: number | null | undefined;
  zeroBased?: boolean | null | undefined;
};
export type Unpaginated = {
  unpaginated: boolean;
};
export type ContinueReadingMediaQuery$variables = {
  pagination: Pagination;
};
export type ContinueReadingMediaQuery$data = {
  readonly " $fragmentSpreads": FragmentRefs<"ContinueReadingMediaFragment">;
};
export type ContinueReadingMediaQuery = {
  response: ContinueReadingMediaQuery$data;
  variables: ContinueReadingMediaQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
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
    "name": "ContinueReadingMediaQuery",
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
    "name": "ContinueReadingMediaQuery",
    "selections": [
      {
        "alias": null,
        "args": (v1/*: any*/),
        "concreteType": "PaginatedMediaResponse",
        "kind": "LinkedField",
        "name": "media",
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
                    "name": "currentCursor",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "nextCursor",
                    "storageKey": null
                  }
                ],
                "type": "CursorPaginationInfo",
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
    "cacheID": "a3f0719a867d041d4fa33b579caa42d9",
    "id": null,
    "metadata": {},
    "name": "ContinueReadingMediaQuery",
    "operationKind": "query",
    "text": "query ContinueReadingMediaQuery(\n  $pagination: Pagination!\n) {\n  ...ContinueReadingMediaFragment_5qyiy\n}\n\nfragment ContinueReadingMediaFragment_5qyiy on Query {\n  media(pagination: $pagination) {\n    nodes {\n      id\n    }\n    pageInfo {\n      __typename\n      ... on CursorPaginationInfo {\n        currentCursor\n        nextCursor\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "766384a344907c205567f98b44ba6d98";

export default node;
