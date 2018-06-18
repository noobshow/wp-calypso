/** @format */

/**
 * External dependencies
 */
import page from 'page';
import { parse } from 'qs';
import React from 'react';
import { includes, intersection } from 'lodash';
import { parse as parseUrl } from 'url';

/**
 * Internal dependencies
 */
import config from 'config';
import HandleEmailedLinkForm from './magic-login/handle-emailed-link-form';
import MagicLogin from './magic-login';
import WPLogin from './wp-login';
import { fetchOAuth2ClientData } from 'state/oauth2-clients/actions';
import { getLanguageSlugs } from 'lib/i18n-utils';
import { getCurrentUser, getCurrentUserLocale } from 'state/current-user/selectors';

const enhanceContextWithLogin = context => {
	const {
		params: { flow, isJetpack, socialService, twoFactorAuthType },
		path,
	} = context;

	context.primary = (
		<WPLogin
			isJetpack={ isJetpack === 'jetpack' }
			path={ path }
			twoFactorAuthType={ twoFactorAuthType }
			socialService={ socialService }
			socialServiceResponse={ context.hash }
			socialConnect={ flow === 'social-connect' }
			privateSite={ flow === 'private-site' }
		/>
	);
};

// Defining this here so it can be used by both ./index.node.js and ./index.web.js
// We cannot export it from either of those (to import it from the other) because of
// the way that `server/bundler/loader` expects only a default export and nothing else.
export const lang = `:lang(${ getLanguageSlugs().join( '|' ) })?`;

export function login( context, next ) {
	const {
		query: { client_id, redirect_to },
	} = context;

	if ( client_id ) {
		if ( ! redirect_to ) {
			const error = new Error( 'The `redirect_to` query parameter is missing.' );
			error.status = 401;
			return next( error );
		}

		const parsedRedirectUrl = parseUrl( redirect_to );
		const redirectQueryString = parse( parsedRedirectUrl.query );

		if ( client_id !== redirectQueryString.client_id ) {
			const error = new Error(
				'The `redirect_to` query parameter is invalid with the given `client_id`.'
			);
			error.status = 401;
			return next( error );
		}

		context.store
			.dispatch( fetchOAuth2ClientData( Number( client_id ) ) )
			.then( () => {
				enhanceContextWithLogin( context );

				next();
			} )
			.catch( error => next( error ) );
	} else {
		enhanceContextWithLogin( context );

		next();
	}
}

export function magicLogin( context, next ) {
	const { path } = context;

	context.primary = <MagicLogin path={ path } />;

	next();
}

export function magicLoginUse( context, next ) {
	/**
	 * Pull the query arguments out of the URL & into the state.
	 * It unclutters the address bar & will keep tokens out of tracking pixels.
	 */
	if ( context.querystring ) {
		page.replace( context.pathname, context.query );

		return;
	}

	const previousQuery = context.state || {};

	const { client_id, email, token } = previousQuery;

	context.primary = (
		<HandleEmailedLinkForm clientId={ client_id } emailAddress={ email } token={ token } />
	);

	next();
}

export function redirectDefaultLocale( context, next ) {
	// Only handle simple routes
	if ( context.pathname !== '/log-in/en' && context.pathname !== '/log-in/jetpack/en' ) {
		return next();
	}

	// Do not redirect if user bootrapping is disabled
	if (
		! getCurrentUser( context.store.getState() ) &&
		! config.isEnabled( 'wpcom-user-bootstrap' )
	) {
		return next();
	}

	// Do not redirect if user is logged in and the locale is different than english
	// so we force the page to display in english
	const currentUserLocale = getCurrentUserLocale( context.store.getState() );
	if ( currentUserLocale && currentUserLocale !== 'en' ) {
		return next();
	}

	if ( context.params.isJetpack === 'jetpack' ) {
		context.redirect( '/log-in/jetpack' );
	} else {
		context.redirect( '/log-in' );
	}
}

export function redirectJetpack( context, next ) {
	const { isJetpack } = context.params;
	const { redirect_to } = context.query;

	/**
	 * Send arrivals from the jetpack connect process (when site user email matches
	 * a wpcom account) to the jetpack branded login.
	 *
	 * A direct redirect to /log-in/jetpack is not currently done at jetpack.wordpress.com
	 * because the iOS app relies on seeing a request to /log-in$ to show its
	 * native credentials form.
	 */
	if ( isJetpack !== 'jetpack' && includes( redirect_to, 'jetpack/connect' ) ) {
		return context.redirect( context.path.replace( 'log-in', 'log-in/jetpack' ) );
	}
	next();
}

/**
 * A middleware that enables (or disables) server side rendering for the /log-in page.
 *
 * Unlike the rest of the SSRed pages, the log-in page enables SSRing also when a set of parameters is set (see below
 * whitelistedQueryKeys). Some of these parameters may need to fulfill additional formats (example: when redirect_to is
 * present, then it also needs to start with a certain prefix).
 *
 * @param {object}   context  The entire request context
 * @param {function} next     Next middleware in the running sequence
 */
export function setShouldServerSideRenderLogin( context, next ) {
	const whitelistedQueryKeys = [ 'client_id', 'signup_flow', 'redirect_to' ];
	const queryKeys = Object.keys( context.query );

	// if there are any parameters, they must be ONLY the ones in the whitelist
	const hasOnlyValidKeys =
		queryKeys.length === intersection( queryKeys, whitelistedQueryKeys ).length;

	context.serverSideRender =
		hasOnlyValidKeys && isRedirectToValidForSsr( context.query.redirect_to );

	next();
}

/**
 * Verifies if the given redirect_to value enables SSR or not.
 *
 * @param {string}   redirectToQueryValue The URI-encoded value of the analyzed redirect_to
 * @return {boolean} If the value of &redirect_to= on the log-in page is compatible with SSR
 */
function isRedirectToValidForSsr( redirectToQueryValue ) {
	if ( 'undefined' === typeof redirectToQueryValue ) {
		return true;
	}

	const redirectToDecoded = decodeURIComponent( redirectToQueryValue );
	return (
		redirectToDecoded.startsWith( 'https://wordpress.com/theme' ) ||
		redirectToDecoded.startsWith( 'https://wordpress.com/go' )
	);
}
