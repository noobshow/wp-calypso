/**
 * External dependencies
 */
import React, { PropTypes } from 'react';
import { localize } from 'i18n-calypso';

/**
 * Internal dependencies
 */
import Dialog from 'components/dialog';

const AcceptDialog = React.createClass( {
	propTypes: {
		translate: PropTypes.func,
		message: PropTypes.node,
		onClose: PropTypes.func.isRequired,
		confirmButtonText: PropTypes.node,
		cancelButtonText: PropTypes.node,
	},

	getInitialState: function() {
		return { isVisible: true };
	},

	onClose: function( action ) {
		this.props.onClose( 'accept' === action );

		if ( this.isMounted() ) {
			this.setState( { isVisible: false } );
		}
	},

	getActionButtons: function() {
		const cancelButton = React.isValidElement( this.props.cancelButtonText ) ? this.props.cancelButtonText : {
			action: 'cancel',
			label: this.props.cancelButtonText ? this.props.cancelButtonText : this.props.translate( 'Cancel' ),
		};
		const confirmButton = React.isValidElement( this.props.confirmButtonText ) ? this.props.confirmButtonText : {
			action: 'accept',
			label: this.props.confirmButtonText ? this.props.confirmButtonText : this.props.translate( 'OK' ),
			isPrimary: true,
		};
		return [
			cancelButton,
			confirmButton,
		];
	},

	render: function() {
		if ( ! this.state.isVisible ) {
			return null;
		}

		return (
			<Dialog
				buttons={ this.getActionButtons() }
				onClose={ this.onClose }
				className="accept-dialog"
				isVisible>
				{ this.props.message }
			</Dialog>
		);
	}
} );

export default localize( AcceptDialog );
