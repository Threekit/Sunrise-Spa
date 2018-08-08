import { createAuthMiddlewareForClientCredentialsFlow, createAuthMiddlewareForPasswordFlow }
  from '@commercetools/sdk-middleware-auth/dist/commercetools-sdk-middleware-auth.cjs';
import Vue from 'vue';
import VueApollo from 'vue-apollo';
import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import { setContext } from 'apollo-link-context';
import { createApolloClient, restartWebsockets } from 'vue-cli-plugin-apollo/graphql-client';
import config from '@/../sunrise.config';
import introspectionQueryResultData from '@/../graphql-fragments.json';

// Install the vue plugin
Vue.use(VueApollo);

// Matcher for fragments on unions and interfaces
const fragmentMatcher = new IntrospectionFragmentMatcher({ introspectionQueryResultData });

// Config
const defaultOptions = {
  httpEndpoint: process.env.VUE_APP_GRAPHQL_HTTP || `${config.ct.api.host}/${config.ct.auth.projectKey}/graphql`,
  cache: new InMemoryCache({ fragmentMatcher }),
};

function createAuthLink(getClient) {
  return setContext((_, prevContext) => {
    const { authMiddleware } = getClient();
    return new Promise((resolve, reject) => {
      if (authMiddleware) {
        authMiddleware(newContext => resolve(newContext))(prevContext, { resolve, reject });
      } else {
        reject(new Error('Could not authenticate, probably you are not logged in'));
      }
    });
  });
}

function createClient(options) {
  const defaultAuthMiddleware = createAuthMiddlewareForClientCredentialsFlow(config.ct.auth);

  const { apolloClient, wsClient } = createApolloClient({
    ...defaultOptions,
    ...options,
    link: createAuthLink(() => apolloClient),
  });

  apolloClient.wsClient = wsClient;
  apolloClient.authMiddleware = defaultAuthMiddleware;

  apolloClient.login = async (username, password) => {
    apolloClient.authMiddleware = createAuthMiddlewareForPasswordFlow({
      ...config.ct.auth,
      credentials: {
        ...config.ct.auth.credentials,
        user: { username, password },
      },
    });
    if (apolloClient.wsClient) restartWebsockets(apolloClient.wsClient);
    try {
      await apolloClient.resetStore();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('%cError on cache reset (login)', 'color: orange;', e.message);
    }
  };

  apolloClient.logout = async () => {
    apolloClient.authMiddleware = defaultAuthMiddleware;
    if (apolloClient.wsClient) restartWebsockets(apolloClient.wsClient);
    try {
      await apolloClient.resetStore();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('%cError on cache reset (logout)', 'color: orange;', e.message);
    }
  };

  return apolloClient;
}

export default function createProvider(options = {}) {
  return new VueApollo({
    defaultClient: createClient(options),
    errorHandler(error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
    },
  });
}
