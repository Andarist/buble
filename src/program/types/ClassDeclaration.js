import Node from '../Node.js';
import deindent from '../../utils/deindent.js';

export default class ClassDeclaration extends Node {
	initialise () {
		this.findScope( true ).addDeclaration( this.id, 'class' );

		this.constructorIndex = this.body.body.findIndex( node => node.kind === 'constructor' );
		this.constructor = this.body.body[ this.constructorIndex ];

		super.initialise();
	}

	transpile () {
		const magicString = this.program.magicString;

		const match = /[ \t]+$/.exec( magicString.original.slice( 0, this.start ) );
		const indentation = match ? match[0] : '';
		const indentStr = magicString.indentStr;

		if ( this.superClass ) {
			magicString.overwrite( this.start, this.start + 5, `var ${this.id.name} = (function (${this.superClass.name}) {\n${indentation + indentStr}function` );
			magicString.remove( this.id.end, this.superClass.end );

			if ( this.constructor ) {
				magicString.remove( this.constructor.start, this.constructor.value.start );
				magicString.move( this.constructor.value.start, this.constructor.value.end, this.body.start );
				magicString.insert( this.body.start, ';' );
			} else {
				magicString.insert( this.body.start, `() {\n${indentation + indentStr + indentStr}${this.superClass.name}.call(this);\n${indentation + indentStr}}\n\n${indentation + indentStr}` );
			}
		} else {
			deindent( this.body, magicString );

			magicString.overwrite( this.start, this.start + 5, `var ${this.id.name} = function` );

			if ( this.constructor ) {
				magicString.remove( this.constructor.start, this.constructor.value.start );
				magicString.move( this.constructor.value.start, this.constructor.value.end, this.body.start );
				magicString.insert( this.body.start, ';' );
			} else {
				magicString.insert( this.body.start, `() {};\n\n${indentation}` );
			}
		}



		let lastIndex = this.body.start;

		magicString.remove( this.body.start, this.body.body[0].start );

		this.body.body.forEach( method => {
			lastIndex = method.end;

			if ( method.kind === 'constructor' ) return;

			if ( method.static ) magicString.remove( method.start, method.start + 7 );

			const lhs = method.static ?
				`${this.id.name}.${method.key.name}` :
				`${this.id.name}.prototype.${method.key.name}`;

			magicString.insert( method.start, `${lhs} = function ` );
			magicString.insert( method.end, ';' );
		});

		magicString.remove( lastIndex, this.end );

		if ( this.superClass ) {
			magicString.insert( this.end, `\n\n${indentation + indentStr}return ${this.id.name};\n${indentation}}(${this.superClass.name}));` );
		}

		super.transpile();
	}
}